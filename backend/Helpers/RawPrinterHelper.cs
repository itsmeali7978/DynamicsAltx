using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace Backend.Helpers
{
    public static class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDocName = "DynamicsAltx Zebra Label";
            [MarshalAs(UnmanagedType.LPStr)]
            public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDataType = "RAW";
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

        [Flags]
        public enum PrinterEnumFlags
        {
            PRINTER_ENUM_LOCAL = 0x00000002,
            PRINTER_ENUM_CONNECTIONS = 0x00000004
        }

        [DllImport("winspool.drv", CharSet = CharSet.Ansi, SetLastError = true)]
        public static extern bool EnumPrinters(PrinterEnumFlags Flags, string? Name, uint Level, IntPtr pPrinterEnum, uint cbBuf, out uint pcbNeeded, out uint pcReturned);

        public static List<string> GetInstalledPrinters()
        {
            var printerNames = new List<string>();
            uint pcbNeeded = 0;
            uint pcReturned = 0;

            EnumPrinters(PrinterEnumFlags.PRINTER_ENUM_LOCAL | PrinterEnumFlags.PRINTER_ENUM_CONNECTIONS, null, 2, IntPtr.Zero, 0, out pcbNeeded, out pcReturned);

            if (pcbNeeded > 0)
            {
                IntPtr pBuf = Marshal.AllocHGlobal((int)pcbNeeded);
                try
                {
                    if (EnumPrinters(PrinterEnumFlags.PRINTER_ENUM_LOCAL | PrinterEnumFlags.PRINTER_ENUM_CONNECTIONS, null, 2, pBuf, pcbNeeded, out pcbNeeded, out pcReturned))
                    {
                        IntPtr currentBuffer = pBuf;
                        int structSize = Marshal.SizeOf(typeof(PRINTER_INFO_2_INTERNAL));

                        for (int i = 0; i < pcReturned; i++)
                        {
                            PRINTER_INFO_2_INTERNAL info = (PRINTER_INFO_2_INTERNAL)Marshal.PtrToStructure(currentBuffer, typeof(PRINTER_INFO_2_INTERNAL))!;
                            if (!string.IsNullOrEmpty(info.pPrinterName) && !printerNames.Contains(info.pPrinterName))
                            {
                                printerNames.Add(info.pPrinterName);
                            }
                            currentBuffer = IntPtr.Add(currentBuffer, structSize);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[RawPrinterHelper] EnumPrinters error: {ex.Message}");
                }
                finally
                {
                    Marshal.FreeHGlobal(pBuf);
                }
            }

            return printerNames;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        private struct PRINTER_INFO_2_INTERNAL
        {
            [MarshalAs(UnmanagedType.LPStr)] public string pServerName;
            [MarshalAs(UnmanagedType.LPStr)] public string pPrinterName;
            [MarshalAs(UnmanagedType.LPStr)] public string pShareName;
            [MarshalAs(UnmanagedType.LPStr)] public string pPortName;
            [MarshalAs(UnmanagedType.LPStr)] public string pDriverName;
            [MarshalAs(UnmanagedType.LPStr)] public string pComment;
            [MarshalAs(UnmanagedType.LPStr)] public string pLocation;
            public IntPtr pDevMode;
            [MarshalAs(UnmanagedType.LPStr)] public string pSepFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pPrintProcessor;
            [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
            [MarshalAs(UnmanagedType.LPStr)] public string pParameters;
            public IntPtr pSecurityDescriptor;
            public uint Attributes;
            public uint Priority;
            public uint DefaultPriority;
            public uint StartTime;
            public uint UntilTime;
            public uint Status;
            public uint cJobs;
            public uint AveragePPM;
        }

        public static string ResolveBestPrinterName(string targetPrinterName)
        {
            // 1. Direct match check
            if (CheckPrinterConnected(targetPrinterName)) return targetPrinterName;

            // 2. Fuzzy match from installed printers
            var installed = GetInstalledPrinters();
            foreach (var printer in installed)
            {
                if (printer.Equals(targetPrinterName, StringComparison.OrdinalIgnoreCase)) return printer;
            }

            // 3. Fallback: match any printer containing GK420 or Zebra
            foreach (var printer in installed)
            {
                if (printer.Contains("GK420", StringComparison.OrdinalIgnoreCase) ||
                    printer.Contains("ZDesigner", StringComparison.OrdinalIgnoreCase))
                {
                    return printer;
                }
            }

            return targetPrinterName;
        }

        public static bool SendStringToPrinter(string szPrinterName, string szString)
        {
            byte[] bytes = System.Text.Encoding.UTF8.GetBytes(szString);
            IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, pBytes, bytes.Length);
            bool success = SendBytesToPrinter(szPrinterName, pBytes, bytes.Length);
            Marshal.FreeCoTaskMem(pBytes);
            return success;
        }

        public static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, Int32 dwCount)
        {
            Int32 dwWritten = 0;
            IntPtr hPrinter = new IntPtr(0);
            DOCINFOA di = new DOCINFOA();
            bool bSuccess = false;

            di.pDocName = "DynamicsAltx Zebra Label";
            di.pDataType = "RAW";

            string resolvedName = ResolveBestPrinterName(szPrinterName);

            if (OpenPrinter(resolvedName, out hPrinter, IntPtr.Zero))
            {
                if (StartDocPrinter(hPrinter, 1, di))
                {
                    if (StartPagePrinter(hPrinter))
                    {
                        bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }

            return bSuccess;
        }

        public static bool CheckPrinterConnected(string printerName)
        {
            IntPtr hPrinter = IntPtr.Zero;
            bool success = OpenPrinter(printerName, out hPrinter, IntPtr.Zero);
            if (success && hPrinter != IntPtr.Zero)
            {
                ClosePrinter(hPrinter);
                return true;
            }

            // Also check fuzzy match
            var installed = GetInstalledPrinters();
            foreach (var printer in installed)
            {
                if (printer.Equals(printerName, StringComparison.OrdinalIgnoreCase) ||
                    printer.Contains("GK420", StringComparison.OrdinalIgnoreCase) ||
                    printer.Contains("ZDesigner", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
