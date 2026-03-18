using System;
using Microsoft.Data.SqlClient;

class Program
{
    static void Main()
    {
        string connectionString = "Server=192.168.105.254;Database=DynamicsAltx;User Id=Pricecheck;Password=hc@123456;TrustServerCertificate=True;";
        using (SqlConnection connection = new SqlConnection(connectionString))
        {
            try
            {
                connection.Open();
                string query = "SELECT TOP 1 BidHNo, NAVDocNo FROM BidLines ORDER BY Id DESC;";
                using (SqlCommand command = new SqlCommand(query, connection))
                using (SqlDataReader reader = command.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        var bidHNo = reader.GetString(0);
                        var navDocNo = reader.GetString(1);
                        Console.WriteLine($"BID_NO:{bidHNo}");
                        Console.WriteLine($"NAV_DOC_NO:{navDocNo}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
