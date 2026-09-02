"use client";

import type { VisibleAdminNotification } from "@/hooks/use-admin-notifications";

export function AdminNotifications({ notifications, onDismiss }: { notifications: VisibleAdminNotification[]; onDismiss: (id: string) => void }) {
  return <aside className="admin-toast-region" aria-label="Notificações" aria-live="polite">
    {notifications.map((notification) => {
      const content = <><b>{notification.message}</b>{notification.detail && <small>{notification.detail}</small>}</>;
      return <article className="admin-toast" key={notification.id}>
        {notification.orderId ? <a href={`/funcionario/pedido/${notification.orderId}`}>{content}</a> : <div>{content}</div>}
        <button type="button" aria-label="Fechar notificação" onClick={() => onDismiss(notification.id)}>×</button>
      </article>;
    })}
  </aside>;
}
