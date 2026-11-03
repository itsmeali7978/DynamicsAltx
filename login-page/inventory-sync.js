/**
 * DynamicsAltx - Inventory Master Data Sync & SOP Workflow Logic
 */

let isSyncing = false;
let currentStockCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadSyncStatus();

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeFlushModal();
    });

    // Close modal when clicking outside box
    const modalBackdrop = document.getElementById('flushModalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeFlushModal();
        });
    }
});

/**
 * 1. Load Status and Counts from API
 */
async function loadSyncStatus() {
    try {
        const response = await fetch('/api/InventorySync/status');
        if (!response.ok) {
            console.error('Failed to load inventory sync status:', response.status);
            return;
        }

        const statuses = await response.json();
        let latestDate = null;

        statuses.forEach(item => {
            const countEl = document.getElementById(`count-${item.tableKey}`);
            const timeEl = document.getElementById(`time-${item.tableKey}`);
            const badgeEl = document.getElementById(`badge-${item.tableKey}`);
            const statCountEl = document.getElementById(`stat-${item.tableKey}-count`);
            const flowChipEl = document.getElementById(`flow-chip-${item.tableKey}`);

            const recCount = Number(item.recordCount || 0);
            const formattedCount = recCount.toLocaleString();

            if (countEl) countEl.textContent = `${formattedCount} records`;
            if (statCountEl) statCountEl.textContent = formattedCount;

            // Handle date
            if (timeEl) {
                if (item.lastSyncDate) {
                    const date = new Date(item.lastSyncDate);
                    timeEl.textContent = formatDate(date);
                    if (!latestDate || date > latestDate) latestDate = date;
                } else {
                    timeEl.textContent = 'Never';
                }
            }

            // Handle Stock Count Entries specific status
            if (item.tableKey === 'stockcount') {
                currentStockCount = recCount;
                const modalCountEl = document.getElementById('modal-flush-count');
                if (modalCountEl) modalCountEl.textContent = `${formattedCount} records`;

                if (badgeEl) {
                    if (recCount === 0) {
                        badgeEl.className = 'card-badge badge-success';
                        badgeEl.textContent = 'Clean (0)';
                    } else {
                        badgeEl.className = 'card-badge badge-active';
                        badgeEl.textContent = `${formattedCount} Active`;
                    }
                }

                if (flowChipEl) {
                    if (recCount === 0) {
                        flowChipEl.className = 'step-status-chip clean';
                        flowChipEl.textContent = 'Clean (0)';
                    } else {
                        flowChipEl.className = 'step-status-chip active-entries';
                        flowChipEl.textContent = `${formattedCount} Active`;
                    }
                }
                return;
            }

            // Master Navision Tables (items, itemuom, barcodes)
            if (badgeEl && !isSyncing) {
                if (item.status === 'Success') {
                    badgeEl.className = 'card-badge badge-success';
                    badgeEl.textContent = 'Synced';
                } else if (item.status === 'Failed') {
                    badgeEl.className = 'card-badge badge-error';
                    badgeEl.textContent = 'Failed';
                } else {
                    badgeEl.className = 'card-badge badge-ready';
                    badgeEl.textContent = 'Ready';
                }
            }

            // Flow chip in top diagram
            if (flowChipEl) {
                if (item.status === 'Success') {
                    flowChipEl.className = 'step-status-chip synced';
                    flowChipEl.textContent = `Synced (${formattedCount})`;
                } else if (item.status === 'Failed') {
                    flowChipEl.className = 'step-status-chip active-entries';
                    flowChipEl.textContent = 'Sync Failed';
                } else {
                    flowChipEl.className = 'step-status-chip';
                    flowChipEl.textContent = `${formattedCount} records`;
                }
            }
        });

        const statLastSyncTime = document.getElementById('stat-last-sync-time');
        if (statLastSyncTime) {
            statLastSyncTime.textContent = latestDate ? formatDate(latestDate) : 'Never';
        }
    } catch (err) {
        console.error('Error fetching inventory sync status:', err);
    }
}

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * 2. Flush Stock Count Entries Modal Logic (Step 1)
 */
function openFlushModal() {
    const modal = document.getElementById('flushModalBackdrop');
    const modalCount = document.getElementById('modal-flush-count');
    if (modalCount) modalCount.textContent = `${currentStockCount.toLocaleString()} records`;
    if (modal) modal.classList.add('active');
}

function closeFlushModal() {
    const modal = document.getElementById('flushModalBackdrop');
    if (modal) modal.classList.remove('active');
}

async function confirmFlushStockCount() {
    const btnConfirm = document.getElementById('btnConfirmFlush');
    const btnText = document.getElementById('btnConfirmFlushText');

    if (btnConfirm) btnConfirm.disabled = true;
    if (btnText) btnText.textContent = 'Flushing table...';

    try {
        const response = await fetch('/api/InventorySync/flush-stock-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to flush table');
        }

        closeFlushModal();
        showToast(result.message || 'Successfully flushed all records from Stock Count Entries!', 'success');
        await loadSyncStatus();
    } catch (err) {
        console.error('Flush error:', err);
        showToast(`Flush failed: ${err.message}`, 'error');
    } finally {
        if (btnConfirm) btnConfirm.disabled = false;
        if (btnText) btnText.textContent = 'Yes, Flush Entire Table';
    }
}

/**
 * 3. Single Table Sync via SSE Stream (Steps 2, 3, 4)
 */
async function syncTable(tableKey) {
    if (isSyncing) {
        showToast('Another sync operation is currently running. Please wait.', 'warning');
        return;
    }

    const btn = document.getElementById(`btn-${tableKey}`);
    const badge = document.getElementById(`badge-${tableKey}`);
    const bar = document.getElementById(`bar-${tableKey}`);
    const pct = document.getElementById(`pct-${tableKey}`);
    const msg = document.getElementById(`msg-${tableKey}`);
    const flowBtn = document.getElementById(`flow-btn-${tableKey}`);
    const flowChip = document.getElementById(`flow-chip-${tableKey}`);
    const btnSyncAll = document.getElementById('btn-sync-all');
    const btnFullPrep = document.getElementById('btn-run-full-prep');

    isSyncing = true;
    if (btn) btn.disabled = true;
    if (flowBtn) flowBtn.disabled = true;
    if (btnSyncAll) btnSyncAll.disabled = true;
    if (btnFullPrep) btnFullPrep.disabled = true;

    if (badge) {
        badge.className = 'card-badge badge-syncing';
        badge.textContent = 'Syncing...';
    }

    if (flowChip) {
        flowChip.className = 'step-status-chip pending';
        flowChip.textContent = 'Syncing...';
    }

    if (bar) {
        bar.className = 'progress-bar-fill';
        bar.style.width = '5%';
    }
    if (pct) pct.textContent = '5%';
    if (msg) msg.textContent = 'Connecting to Navision...';

    try {
        const response = await fetch(`/api/InventorySync/sync-stream?table=${encodeURIComponent(tableKey)}`);
        
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep last incomplete line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const jsonStr = trimmed.replace(/^data:\s*/, '');
                try {
                    const data = JSON.parse(jsonStr);

                    if (data.failed || data.error) {
                        throw new Error(data.error || 'Sync failed');
                    }

                    if (typeof data.progress === 'number') {
                        if (bar) bar.style.width = `${data.progress}%`;
                        if (pct) pct.textContent = `${data.progress}%`;
                    }

                    if (data.message && msg) {
                        msg.textContent = data.message;
                    }

                    if (data.completed) {
                        if (bar) {
                            bar.style.width = '100%';
                            bar.className = 'progress-bar-fill success';
                        }
                        if (pct) pct.textContent = '100%';
                        if (badge) {
                            badge.className = 'card-badge badge-success';
                            badge.textContent = 'Synced';
                        }
                        if (flowChip) {
                            flowChip.className = 'step-status-chip synced';
                            flowChip.textContent = `Synced (${Number(data.recordsSynced || 0).toLocaleString()})`;
                        }
                        showToast(`Successfully synced ${data.recordsSynced.toLocaleString()} records!`, 'success');
                    }
                } catch (parseErr) {
                    console.error('Error parsing SSE event:', parseErr, jsonStr);
                }
            }
        }
    } catch (err) {
        console.error(`Sync error on ${tableKey}:`, err);
        if (bar) bar.className = 'progress-bar-fill error';
        if (badge) {
            badge.className = 'card-badge badge-error';
            badge.textContent = 'Failed';
        }
        if (flowChip) {
            flowChip.className = 'step-status-chip active-entries';
            flowChip.textContent = 'Sync Failed';
        }
        if (msg) msg.textContent = `Error: ${err.message}`;
        showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
        isSyncing = false;
        if (btn) btn.disabled = false;
        if (flowBtn) flowBtn.disabled = false;
        if (btnSyncAll) btnSyncAll.disabled = false;
        if (btnFullPrep) btnFullPrep.disabled = false;
        await loadSyncStatus();
    }
}

/**
 * 4. Sync All Master Tables sequentially (Steps 2 → 4)
 */
async function syncAllTables() {
    if (isSyncing) {
        showToast('A sync operation is already in progress.', 'warning');
        return;
    }

    const tables = ['items', 'itemuom', 'barcodes'];
    showToast('Starting sequential synchronization of all 3 master tables (Steps 2 → 4)...', 'info');

    for (const tableKey of tables) {
        await syncTable(tableKey);
        await new Promise(r => setTimeout(r, 600));
    }

    showToast('All 3 master tables (Items, UOM, Barcodes) synchronized successfully!', 'success');
}

/**
 * 5. 1-Click Complete Preparation Workflow (Steps 1 → 4 Sequential)
 * Concept:
 * 1) Flush Stock Count Entries
 * 2) Sync Altx Inv Item table
 * 3) Sync Altx Inv Item UOM table
 * 4) Sync Altx Inv Item Barcodes table
 * If finished, ready to start stock count!
 */
async function runFullPreparationWorkflow() {
    if (isSyncing) {
        showToast('An operation is already in progress.', 'warning');
        return;
    }

    const confirmed = confirm(
        "Run Full Inventory Preparation Workflow?\n\n" +
        "1) Step 1: Flush all records from Stock Count Entries\n" +
        "2) Step 2: Sync Altx Inv Item table from NAV\n" +
        "3) Step 3: Sync Altx Inv Item UOM table from NAV\n" +
        "4) Step 4: Sync Altx Inv Item Barcodes table from NAV\n\n" +
        "Do you want to proceed?"
    );

    if (!confirmed) return;

    showToast('Starting Step 1: Flushing Stock Count Entries...', 'info');

    try {
        // Step 1: Flush table
        const flushRes = await fetch('/api/InventorySync/flush-stock-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const flushData = await flushRes.json();
        if (!flushRes.ok || !flushData.success) {
            throw new Error(flushData.message || 'Failed to flush table');
        }
        await loadSyncStatus();
        showToast(`Step 1 Complete: Flushed ${flushData.flushedCount} entries. Starting Step 2...`, 'success');
        await new Promise(r => setTimeout(r, 600));

        // Step 2, 3, 4: Sync Master Tables
        const tables = [
            { key: 'items', name: 'Altx Inv Items (Step 2)' },
            { key: 'itemuom', name: 'Altx Inv ItemUOM (Step 3)' },
            { key: 'barcodes', name: 'Altx Inv ItemBarcodes (Step 4)' }
        ];

        for (const t of tables) {
            showToast(`Synchronizing ${t.name}...`, 'info');
            await syncTable(t.key);
            await new Promise(r => setTimeout(r, 600));
        }

        showToast('🎯 Complete Inventory Preparation Finished! All 4 steps are complete. You can now start Stock Count!', 'success');
    } catch (err) {
        console.error('Workflow error:', err);
        showToast(`Workflow stopped: ${err.message}`, 'error');
    }
}
