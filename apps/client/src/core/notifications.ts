import notifier from 'node-notifier';

export interface NotificationOptions {
    title: string;
    message: string;
    sound?: boolean;
    wait?: boolean;
}

class NotificationService {
    private enabled: boolean = true;

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    notify(options: NotificationOptions): void {
        if (!this.enabled) return;

        notifier.notify({
            title: options.title,
            message: options.message,
            sound: options.sound ?? true,
            wait: options.wait ?? false,
            appID: 'tchat',
        });
    }

    notifyMessage(sender: string, preview: string): void {
        this.notify({
            title: `Message from ${sender}`,
            message: preview.length > 50 ? preview.slice(0, 47) + '...' : preview,
            sound: true,
        });
    }

    notifyMention(sender: string, room: string): void {
        this.notify({
            title: `${sender} mentioned you in ${room}`,
            message: 'You were mentioned in a channel',
            sound: true,
        });
    }
}

export const notifications = new NotificationService();
