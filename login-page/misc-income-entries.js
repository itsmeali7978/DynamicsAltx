document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadEntries();

    // Event listeners for filters
    const filterDate = document.getElementById('filter-date');
    const filterType = document.getElementById('filter-type');
    const clearBtn = document.getElementById('clear-filters-btn');

    if (filterDate) {
        filterDate.addEventListener('change', loadEntries);
    }
    if (filterType) {
        filterType.addEventListener('change', loadEntries);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (filterDate) filterDate.value = '';
            if (filterType) filterType.value = '';
            loadEntries();
        });
    }
});

async function loadEntries() {
    const tableBody = document.getElementById('entries-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading entries...</td></tr>';

    const dateVal = document.getElementById('filter-date')?.value || '';
    const typeVal = document.getElementById('filter-type')?.value || '';

    let url = '/api/MiscellaneousIncome/list';
    const params = new URLSearchParams();
    if (dateVal) params.append('date', dateVal);
    if (typeVal) params.append('type', typeVal);

    if (params.toString()) {
        url += '?' + params.toString();
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch entries');
        
        const entries = await response.json();

        if (entries.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No entries found matching criteria.</td></tr>';
            return;
        }

        const formatter = new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR'
        });

        tableBody.innerHTML = entries.map(entry => {
            let pillClass = '';
            if (entry.entryType === 'Income') pillClass = 'type-income';
            else if (entry.entryType === 'Expense') pillClass = 'type-expense';
            else if (entry.entryType === 'Opening Balance') pillClass = 'type-opening';

            return `
                <tr>
                    <td><strong>#${entry.id}</strong></td>
                    <td><span class="type-pill ${pillClass}">${entry.entryType}</span></td>
                    <td style="font-weight: 600;">${formatter.format(entry.amount)}</td>
                    <td>${new Date(entry.transactionDate).toLocaleDateString()}</td>
                    <td>${entry.remarks || '-'}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading history:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error loading entries data.</td></tr>';
    }
}
