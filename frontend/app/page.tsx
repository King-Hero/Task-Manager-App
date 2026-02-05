export default async function Home() {
  const res = await fetch("http://127.0.0.1:8000/api/health", {
    cache: "no-store",
  });

  const data = await res.json();

  return (
    <main style={{ padding: 24 }}>
      <h1>Task Manager</h1>
      <p>API Health: {data.status}</p>
    </main>
  );
}