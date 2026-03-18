document.addEventListener('DOMContentLoaded', async () => {
    await fetchBids();

    const searchInput = document.getElementById('bid-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterBids(e.target.value);
        });
    }
});

let allBids = [];

async function fetchBids() {
    try {
        const response = await fetch('http://192.168.105.238:8000/api/Bidding/Bids');
        if (!response.ok) throw new Error('Failed to fetch bids');
        
        allBids = await response.json();
        renderBids(allBids);
    } catch (error) {
        console.error('Error fetching bids:', error);
        showToast('Could not load bidding requests.', 'error');
    }
}

function renderBids(bids) {
    const body = document.getElementById('bid-list-body');
    const emptyState = document.getElementById('empty-state');
    
    body.innerHTML = '';
    
    if (bids.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';

    bids.forEach(bid => {
        const date = new Date(bid.createdDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="bid-badge">${bid.bidNo}</span></td>
            <td>${date}</td>
            <td><span class="status-pill ${bid.status.toLowerCase() === 'active' ? 'info' : 'success'}">${bid.status}</span></td>
            <td style="text-align: right;">
                <button class="btn-edit" onclick="editBid('${bid.bidNo}')">
                    <i class="ri-edit-line"></i> Open & Edit
                </button>
            </td>
        `;
        body.appendChild(row);
    });
}

function filterBids(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allBids.filter(bid => 
        bid.bidNo.toLowerCase().includes(lowerQuery)
    );
    renderBids(filtered);
}

function editBid(bidNo) {
    window.location.href = `bidding-create.html?bidNo=${bidNo}`;
}
