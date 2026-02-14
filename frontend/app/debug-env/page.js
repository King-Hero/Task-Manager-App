export const dynamic = "force-dynamic";

export default function DebugEnv() {
  return (
    <pre style={{ padding: 20 }}>
{JSON.stringify(
  {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || null,
    NODE_ENV: process.env.NODE_ENV || null,
    PORT: process.env.PORT || null,
  },
  null,
  2
)}
    </pre>
  );
}
