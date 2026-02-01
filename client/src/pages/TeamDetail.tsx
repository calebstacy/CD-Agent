export default function TeamDetail({ teamId }: { teamId: number }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team {teamId}</h1>
      <p className="text-muted-foreground">Team details coming soon</p>
    </div>
  );
}
