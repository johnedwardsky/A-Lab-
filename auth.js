/**
 * A-LAB AUTH ENGINE
 * Handles user authentication via Supabase.
 */

const ALabAuth = {
    async signUp(email, password, metadata) {
        const { data, error } = await window.ALabCore.db.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        return { data, error };
    },

    async signIn(email, password) {
        const { data, error } = await window.ALabCore.db.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signOut() {
        const { error } = await window.ALabCore.db.auth.signOut();
        if (!error) window.location.href = 'login.html';
    },

    async getUser() {
        const { data: { user } } = await window.ALabCore.db.auth.getUser();
        return user;
    },

    async checkSession(redirectIfNoAuth = true) {
        const user = await this.getUser();
        if (!user && redirectIfNoAuth) {
            window.location.href = 'login.html';
        }
        return user;
    }
};
