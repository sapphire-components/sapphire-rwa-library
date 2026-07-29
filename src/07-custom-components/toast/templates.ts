export const tmplToastMessage = document.createElement("template");
tmplToastMessage.innerHTML = `
    <div class="toast-notification">
        <div class="toast-notification-content">
            <div class="toast-notification-content-icon"></div>
            <div class="toast-notification-content-text">
                <div class="toast-notification-content-text-title"></div>
                <div class="toast-notification-content-text-body"></div>
            </div>
            <div class="toast-notification-content-close"></div>
        </div>
        <div class="toast-notification-progress"></div>
    </div>
`;
