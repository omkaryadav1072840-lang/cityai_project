/**
 * SMARTCITY AI - AUTH API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.AuthAPI = {
        login: async (credentials) => {
            const res = await client.post("/api/login", credentials);
            if (res.success && res.data && res.data.token) {
                client.setToken(res.data.token, res.data.user || res.data);
            }
            return res;
        },

        staffLogin: async (credentials) => {
            const res = await client.post("/api/staff-login", credentials);
            if (res.success && res.data && res.data.token) {
                client.setToken(res.data.token, res.data.user || res.data);
            }
            return res;
        },

        register: async (userData) => {
            return await client.post("/api/register", userData);
        },

        logout: () => {
            client.clearToken();
            window.location.href = "/pages/login.html";
        },

        getCurrentUser: () => {
            return client.getUser();
        },

        isAuthenticated: () => {
            return !!client.getToken();
        }
    };
})();
