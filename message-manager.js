/**
 * A-LAB: MESSAGE MANAGER
 * ============================================================
 * Handles: loading chats, fetching message history,
 * sending messages, and real-time updates.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const MessageManager = {
        chats: [],
        messages: [],
        currentRecipientId: null,
        residentId: null,
        subscription: null,

        /**
         * Initialize
         */
        async init(residentId) {
            this.residentId = residentId;
            this.setupSubscription();

            // Initial load of chats
            await this.loadChats();
        },

        /**
         * Subscribe to real-time message updates
         */
        setupSubscription() {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return;

            if (this.subscription) {
                db.removeChannel(this.subscription);
            }

            this.subscription = db.channel('messages_realtime')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${this.residentId}`
                }, (payload) => {
                    this.handleNewIncomingMessage(payload.new);
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${this.residentId}`
                }, (payload) => {
                    this.handleNewOutgoingMessage(payload.new);
                })
                .subscribe();
        },

        /**
         * Load all chats (unique residents the user has messaged)
         */
        async loadChats() {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return;

            try {
                // Fetch all messages involving the current resident
                const { data, error } = await db
                    .from('messages')
                    .select(`
                        sender_id,
                        receiver_id,
                        sender:residents!sender_id(full_name, avatar_url),
                        receiver:residents!receiver_id(full_name, avatar_url)
                    `)
                    .or(`sender_id.eq.${this.residentId},receiver_id.eq.${this.residentId}`)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Extract unique residents
                const uniqueResidents = new Map();
                data.forEach(msg => {
                    const otherId = msg.sender_id === this.residentId ? msg.receiver_id : msg.sender_id;
                    const otherProfile = msg.sender_id === this.residentId ? msg.receiver : msg.sender;

                    if (!uniqueResidents.has(otherId)) {
                        uniqueResidents.set(otherId, {
                            id: otherId,
                            full_name: otherProfile.full_name,
                            avatar_url: otherProfile.avatar_url
                        });
                    }
                });

                this.chats = Array.from(uniqueResidents.values());
                document.dispatchEvent(new CustomEvent('alab:chats-loaded', { detail: this.chats }));

            } catch (err) {
                console.error('[MESSAGES] Load chats error:', err);
            }
        },

        /**
         * Load message history with a specific resident
         */
        async loadMessages(recipientId) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return;

            this.currentRecipientId = recipientId;

            try {
                const { data, error } = await db
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${this.residentId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${this.residentId})`)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                this.messages = data;
                document.dispatchEvent(new CustomEvent('alab:messages-loaded', { detail: this.messages }));

            } catch (err) {
                console.error('[MESSAGES] Load messages error:', err);
            }
        },

        /**
         * Send a message
         */
        async sendMessage(recipientId, content) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId || !content.trim()) return;

            try {
                const { data, error } = await db
                    .from('messages')
                    .insert({
                        sender_id: this.residentId,
                        receiver_id: recipientId,
                        content: content.trim()
                    })
                    .select()
                    .single();

                if (error) throw error;

                // UI will be updated via real-time subscription
                return data;

            } catch (err) {
                console.error('[MESSAGES] Send error:', err);
                if (window.showToast) window.showToast('Ошибка отправки сообщения', 'error');
            }
        },

        handleNewIncomingMessage(msg) {
            // Signal a new message arrived (for notifications)
            document.dispatchEvent(new CustomEvent('alab:message-received', { detail: msg }));

            // If the chat with this sender is currently open, refresh messages
            if (this.currentRecipientId === msg.sender_id) {
                this.messages.push(msg);
                document.dispatchEvent(new CustomEvent('alab:messages-updated', { detail: this.messages }));
            }

            // Refresh chat list to show potential new chat or updated order
            this.loadChats();
        },

        handleNewOutgoingMessage(msg) {
            if (this.currentRecipientId === msg.receiver_id) {
                this.messages.push(msg);
                document.dispatchEvent(new CustomEvent('alab:messages-updated', { detail: this.messages }));
            }
            this.loadChats();
        }
    };

    // Expose to window
    window.MessageManager = MessageManager;

})();
