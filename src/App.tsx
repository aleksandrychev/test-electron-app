import { useState } from 'react';
import Editor from '@monaco-editor/react';

const DEFAULT_POLICY = `bundle agent __main__
{
  packages:
    debian::
      "nginx"
        policy => "present",
        package_module => "apt";
}
`;

function App() {
  const [code, setCode] = useState(DEFAULT_POLICY);
  const [messages, setMessages] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    const result = await window.cfengine.lint(code);
    setIsSuccess(result.success);
    setMessages(result.output.split('\n').filter(Boolean));
    setLoading(false);
  };

  const handleFormat = async () => {
    setLoading(true);
    const result = await window.cfengine.format(code);
    if (result.success) {
      setCode(result.output);
      setMessages(['Code formatted successfully']);
      setIsSuccess(true);
    } else {
      setMessages(result.output.split('\n').filter(Boolean));
      setIsSuccess(false);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 16, gap: 12 }}>
      <h2 style={{ margin: 0 }}>CFEngine Constructor</h2>
      <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}>
        <Editor
          defaultLanguage="plaintext"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleValidate} disabled={loading} style={buttonStyle}>
          {loading ? 'Running...' : 'Validate'}
        </button>
        <button onClick={handleFormat} disabled={loading} style={buttonStyle}>
          {loading ? 'Running...' : 'Make Pretty'}
        </button>
      </div>
      <div style={{
        minHeight: 100,
        maxHeight: 200,
        overflow: 'auto',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: 12,
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: '#1e1e1e',
        color: isSuccess ? '#4ec9b0' : '#f48771',
      }}>
        {messages.length === 0
          ? <span style={{ color: '#888' }}>Validation results will appear here</span>
          : messages.map((msg, i) => <div key={i}>{msg}</div>)
        }
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 14,
  cursor: 'pointer',
  borderRadius: 4,
  border: '1px solid #555',
  backgroundColor: '#2d2d2d',
  color: '#fff',
};

export default App;
