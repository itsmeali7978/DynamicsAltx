/**
 * DynamicsAltx - Vendor Tasks Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Selection
    const taskListGrid = document.getElementById('task-list');
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnAddTask = document.getElementById('btn-add-task');
    const closeModal = document.getElementById('close-modal');
    const taskNameEngInput = document.getElementById('task-name-eng');
    const taskNameArbInput = document.getElementById('task-name-arb');
    const taskIdInput = document.getElementById('task-id');
    const modalTitle = document.getElementById('modal-title');

    const API_BASE = '/api/VendorTasks';

    // 0. Security Guard (Admin Only)
    const userRole = localStorage.getItem('userRole');
    if (userRole && userRole.toLowerCase() !== 'admin') {
        window.showAlert?.('Access Denied: This module is reserved for System Administrators only.', 'Security Alert').then(() => {
            window.location.href = 'dashboard.html';
        });
        return;
    }

    // 2. Fetch & Render
    const fetchTasks = async () => {
        try {
            const response = await fetch(API_BASE);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            renderTasks(data);
        } catch (error) {
            console.error('Fetch Error:', error);
            taskListGrid.innerHTML = `<div class="error-state">Error loading records: ${error.message}</div>`;
        }
    };

    const renderTasks = (tasks) => {
        if (tasks.length === 0) {
            taskListGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ri-task-line" style="font-size: 3rem; display: block; margin-bottom: 1rem;"></i>
                    <p>No vendor tasks found. Click "New Vendor Task" to add one.</p>
                </div>
            `;
            return;
        }

        taskListGrid.innerHTML = tasks.map(t => `
            <div class="nat-card">
                <div class="nat-info">
                    <div class="nat-icon">
                        <i class="ri-task-line"></i>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span class="nat-name">${t.nameEng}</span>
                        <span style="font-size: 0.85rem; color: var(--text-muted);">${t.nameArb}</span>
                    </div>
                </div>
                <div class="nat-actions">
                    <button class="action-btn btn-edit" onclick="window.editTask(${t.id}, '${t.nameEng}', '${t.nameArb}')" title="Edit">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="window.deleteTask(${t.id})" title="Delete">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');
    };

    // 3. Modal Handlers
    const openModal = (id = null, nameEng = '', nameArb = '') => {
        taskIdInput.value = id || '';
        taskNameEngInput.value = nameEng;
        taskNameArbInput.value = nameArb;
        modalTitle.innerText = id ? 'Edit Vendor Task' : 'New Vendor Task';
        taskModal.classList.add('active');
        taskNameEngInput.focus();
    };

    const hideModal = () => {
        taskModal.classList.remove('active');
        taskForm.reset();
    };

    // 4. CRUD Operations
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = taskIdInput.value;
        const nameEng = taskNameEngInput.value.trim();
        const nameArb = taskNameArbInput.value.trim();

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/${id}` : API_BASE;
        const body = id ? { id: parseInt(id), nameEng, nameArb } : { nameEng, nameArb };

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Error saving record');
            }

            window.showToast?.('Record saved successfully', 'success');
            hideModal();
            fetchTasks();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    });

    window.editTask = (id, nameEng, nameArb) => {
        openModal(id, nameEng, nameArb);
    };

    window.deleteTask = async (id) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error deleting record');

            window.showToast?.('Deleted successfully', 'success');
            fetchTasks();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    };

    // 6. Listeners
    btnAddTask.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', hideModal);
    
    // Close modal on outside click
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) hideModal();
    });

    // Initial Load
    fetchTasks();
});
