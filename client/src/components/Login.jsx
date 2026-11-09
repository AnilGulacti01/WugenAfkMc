import { useState } from 'react';

function Login({ onLogin, status }) {
    const [formData, setFormData] = useState({
        host: '',
        port: 25565,
        username: '',
        authType: 'offline', // Default to offline for ease
        version: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(formData);
    };

    return (
        <div className="login-container glass-panel">
            <div className="login-header">
                <h1>WugenAFK</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connect to any Minecraft Server</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Server Address</label>
                    <input
                        type="text"
                        placeholder="mc.hypixel.net"
                        required
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Port</label>
                    <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    />
                </div>

                <div className="form-group">
                    <label>Username / Email</label>
                    <input
                        type="text"
                        placeholder="Notch"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Authentication</label>
                    <select
                        value={formData.authType}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                    >
                        <option value="offline">Offline (Cracked)</option>
                        <option value="microsoft">Microsoft (Premium)</option>
                    </select>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Connect to Server
                </button>
            </form>

            {status && status.message && (
                <div style={{
                    textAlign: 'center',
                    color: status.type === 'error' ? 'var(--danger)' : 'var(--accent)',
                    fontSize: '0.85rem',
                    marginTop: '0.5rem'
                }}>
                    {status.message}
                </div>
            )}
        </div>
    );
}

export default Login;
