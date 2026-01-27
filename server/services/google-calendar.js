import { google } from 'googleapis';
import dotenv from 'dotenv';
import { config } from '../database.js';

dotenv.config();

/**
 * Google Calendar Service
 * 
 * Gère la synchronisation bidirectionnelle par utilisateur.
 */

const GOOGLE_CALENDAR_ENABLED = process.env.GOOGLE_CALENDAR_ENABLED === 'true';

// Multi-user state
const userClients = {}; // { Tiago: { calendar, oauth2Client }, Dani: { ... } }

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

export async function initGoogleCalendar() {
    if (!GOOGLE_CALENDAR_ENABLED) return false;
    if (!CLIENT_ID || !CLIENT_SECRET) return false;

    // We don't pre-init everything, we init per user as needed or on request
    const users = ['Tiago', 'Dani']; // Known users
    for (const userId of users) {
        await initUserClient(userId);
    }
    return true;
}

async function initUserClient(userId) {
    if (userClients[userId]) return userClients[userId];

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const refreshToken = config.get(`GOOGLE_REFRESH_TOKEN_${userId}`);

    if (refreshToken) {
        try {
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            userClients[userId] = { calendar, oauth2Client };
            console.log(`[Google Calendar] Client initialisé pour ${userId}`);
            return userClients[userId];
        } catch (error) {
            console.error(`[Google Calendar] Erreur init pour ${userId}:`, error.message);
        }
    }
    return null;
}

export function getAuthUrl(userId) {
    if (!CLIENT_ID || !CLIENT_SECRET) return null;
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        prompt: 'consent',
        state: userId // Pass userId in state to recover it in callback
    });
}

export async function handleCallback(code, userId) {
    try {
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        const { tokens } = await oauth2Client.getToken(code);

        if (tokens.refresh_token) {
            config.set(`GOOGLE_REFRESH_TOKEN_${userId}`, tokens.refresh_token);
        }

        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        userClients[userId] = { calendar, oauth2Client };

        console.log(`[Google Calendar] Authentification réussie pour ${userId}`);
        return true;
    } catch (error) {
        console.error(`[Google Calendar] Erreur callback pour ${userId}:`, error.message);
        return false;
    }
}

/**
 * Crée un événement pour un utilisateur spécifique
 */
export async function createGoogleEvent(event, userId) {
    if (!userId) return null;
    const client = await initUserClient(userId);
    if (!client) return null;

    try {
        const gcalEvent = formatEvent(event);
        const response = await client.calendar.events.insert({
            calendarId: 'primary',
            requestBody: gcalEvent
        });
        return response.data.id;
    } catch (error) {
        console.error(`[Google Calendar] Erreur création (${userId}):`, error.message);
        return null;
    }
}

export async function updateGoogleEvent(googleEventId, updates, userId) {
    if (!userId || !googleEventId) return false;
    const client = await initUserClient(userId);
    if (!client) return false;

    try {
        const gcalEvent = formatEvent(updates);
        await client.calendar.events.patch({
            calendarId: 'primary',
            eventId: googleEventId,
            requestBody: gcalEvent
        });
        return true;
    } catch (error) {
        console.error(`[Google Calendar] Erreur mise à jour (${userId}):`, error.message);
        return false;
    }
}

export async function deleteGoogleEvent(googleEventId, userId) {
    if (!userId || !googleEventId) return false;
    const client = await initUserClient(userId);
    if (!client) return false;

    try {
        await client.calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId
        });
        return true;
    } catch (error) {
        if (error.code === 404) return true;
        console.error(`[Google Calendar] Erreur suppression (${userId}):`, error.message);
        return false;
    }
}

function formatEvent(event) {
    let start, end;
    if (event.time) {
        const dateStr = event.date || new Date().toISOString().split('T')[0];
        const startDateTime = `${dateStr}T${event.time}:00`;
        const [hours, minutes] = event.time.split(':').map(Number);
        const endHours = hours + 1;
        const endDateTime = `${dateStr}T${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        start = { dateTime: startDateTime, timeZone: 'Europe/Paris' };
        end = { dateTime: endDateTime, timeZone: 'Europe/Paris' };
    } else {
        const dateStr = event.date || new Date().toISOString().split('T')[0];
        start = { date: dateStr };
        end = { date: dateStr };
    }

    return {
        summary: event.name,
        description: `Assigné à: ${event.assignee}\nSync via Livrando App.`,
        start,
        end
    };
}

// Initialisation
initGoogleCalendar();

export default {
    getAuthUrl,
    handleCallback,
    createGoogleEvent,
    updateGoogleEvent,
    deleteGoogleEvent,
    isEnabled: (userId) => !!userClients[userId]
};

