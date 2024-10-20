import axios from 'axios';
import { env } from '@/lib/env'

export async function sendNotification(chatId: String, msg: String) {
    try {
        await axios.get(`${env.TELEGRAM_API_URL}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: msg,
                parse_mode: 'MarkdownV2',
                disable_notification: false,
                protect_content: false,
            },
        });
    } catch (error) {
        console.error("Unable to send notification.", error)
        return false;
    }
    return true;
}
