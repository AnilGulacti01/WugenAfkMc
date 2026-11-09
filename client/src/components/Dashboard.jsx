import { useState, useEffect, useRef, useCallback } from 'react';

// Keyboard code -> mineflayer control state
const KEY_MAP = {
    KeyW: 'forward',
    ArrowUp: 'forward',
    KeyS: 'back',
    ArrowDown: 'back',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'jump',
    ShiftLeft: 'sneak',
    ShiftRight: 'sneak',
    ControlLeft: 'sprint',
    ControlRight: 'sprint',
};

// Pressing one of these releases its opposite, so the bot never gets
// "forward + back" at the same time (which cancels out and looks stuck).
const OPPOSITES = {
    forward: 'back',
    back: 'forward',
    left: 'right',
    right: 'left',
};

const RELEASED = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false,
};

function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
    );
}

function Dashboard({ socket, botInfo, chatLogs, status, stats, onDisconnect }) {
    const [inputMsg, setInputMsg] = useState('');
    const [isAfk, setIsAfk] = useState(false);
    const [controls, setControls] = useState(RELEASED);
    const controlsRef = useRef(RELEASED);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatLogs]);

    const applyControls = useCallback((next) => {
        controlsRef.current = next;
        setControls(next);
        socket.emit('move', next);
    }, [socket]);

    // WASD / arrow keys drive the bot while the dashboard is open.
    // Keys typed into the chat box are ignored.
    useEffect(() => {
        const handleKey = (event, pressed) => {
            const action = KEY_MAP[event.code];
            if (!action) return;

            if (pressed && isTypingTarget(event.target)) return;

            event.preventDefault();
            if (controlsRef.current[action] === pressed) return;

            const next = { ...controlsRef.current, [action]: pressed };
            if (pressed && OPPOSITES[action]) {
                next[OPPOSITES[action]] = false;
            }
            applyControls(next);
        };

        const onKeyDown = (event) => handleKey(event, true);
        const onKeyUp = (event) => handleKey(event, false);

        // Focus loss (alt-tab, clicking outside) would otherwise leave a key stuck.
        const releaseAll = () => {
            if (Object.values(controlsRef.current).some(Boolean)) {
                applyControls({ ...RELEASED });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', releaseAll);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', releaseAll);
            releaseAll();
        };
    }, [applyControls]);

    const sendChat = (e) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;
        socket.emit('send_chat', inputMsg);
        setInputMsg('');
    };

    const toggleAfk = () => {
        const newState = !isAfk;
        setIsAfk(newState);
        socket.emit('toggle_afk', newState);
    };

    return (
        <div className="dashboard-container glass-panel">
            {/* Header */}
            <div className="header" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>{botInfo ? botInfo.username : 'Unknown'}</h2>
                    <span className={`status-badge ${status.type === 'error' ? 'status-disconnected' : 'status-connected'}`}>
                        {status.type === 'error' ? 'Error' : 'Online'}
                    </span>
                </div>
                <button
                    onClick={onDisconnect}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Disconnect
                </button>
            </div>

            {/* Sidebar Controls */}
            <div className="sidebar">
                <div className="stat-card">
                    <div className="stat-label">HEALTH</div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>
                        {Math.round(stats.health)} <span style={{ fontSize: '1rem' }}>♥</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">FOOD</div>
                    <div className="stat-value" style={{ color: '#fb923c' }}>
                        {Math.round(stats.food)} <span style={{ fontSize: '1rem' }}>🍖</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">MOVEMENT</div>
                    <div className="move-pad">
                        <span className={`move-key w ${controls.forward ? 'active' : ''}`}>W</span>
                        <span className={`move-key a ${controls.left ? 'active' : ''}`}>A</span>
                        <span className={`move-key s ${controls.back ? 'active' : ''}`}>S</span>
                        <span className={`move-key d ${controls.right ? 'active' : ''}`}>D</span>
                    </div>
                    <div className="move-hints">
                        <span className={controls.jump ? 'active' : ''}>SPACE jump</span>
                        <span className={controls.sneak ? 'active' : ''}>SHIFT sneak</span>
                        <span className={controls.sprint ? 'active' : ''}>CTRL sprint</span>
                    </div>
                </div>

                <div className="stat-card" style={{ marginTop: 'auto' }}>
                    <div className="stat-label">ACTIONS</div>
                    <button
                        onClick={toggleAfk}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            background: isAfk ? 'var(--danger)' : 'var(--success)'
                        }}
                    >
                        {isAfk ? 'Stop AFK' : 'Start AFK'}
                    </button>
                </div>
            </div>

            {/* Main Content (Chat) */}
            <div className="main-content">
                <div className="chat-window">
                    {chatLogs.map((log, i) => (
                        <div key={i} className="chat-msg" style={{
                            color: log.username === 'SYSTEM' ? '#fbbf24' : 'inherit',
                            fontStyle: log.username === 'SYSTEM' ? 'italic' : 'normal'
                        }}>
                            <span style={{ color: 'var(--text-muted)' }}>[{new Date(log.timestamp).toLocaleTimeString()}] </span>
                            {log.username !== 'SYSTEM' && <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>&lt;{log.username}&gt; </span>}
                            <span>{log.message}</span>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={sendChat}>
                    <input
                        className="chat-input"
                        type="text"
                        placeholder="Type a message..."
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Send</button>
                </form>
            </div>
        </div>
    );
}

export default Dashboard;
