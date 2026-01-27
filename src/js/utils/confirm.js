export function showConfirm({ title, message, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'primary' }) {
    return new Promise((resolve) => {
        // Create modal element
        const modalId = 'dynamic-confirm-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

        modal.innerHTML = `
            <div class="modal-content modal-confirm">
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
                    <p class="text-gray-400">${message}</p>
                </div>
                <div class="flex justify-center space-x-3">
                    <button id="confirm-cancel" class="btn-secondary px-6">${cancelText}</button>
                    <button id="confirm-ok" class="${btnClass} px-6">${confirmText}</button>
                </div>
            </div>
        `;

        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);

        const cleanup = (value) => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.innerHTML = ''; // Clear content
                resolve(value);
            }, 300);
        };

        modal.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modal.querySelector('#confirm-ok').onclick = () => cleanup(true);

        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) cleanup(false);
        };
    });
}
