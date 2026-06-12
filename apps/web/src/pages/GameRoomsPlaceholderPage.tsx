import { Link, useParams } from 'react-router-dom';

export function GameRoomsPlaceholderPage() {
  const { gameId } = useParams();

  return (
    <section className="rounded-[2rem]  bg-white/75 p-8 shadow-xl shadow-ink/10">
      <p className="w-fit rounded-full bg-moss/10 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.24em] text-moss">
        Rooms coming next
      </p>
      <h1 className="mt-4 font-display text-5xl font-black tracking-tight">Rooms for {gameId}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-ink/70">
        This route is wired for navigation. Room list and room creation are intentionally not implemented yet.
      </p>
      <Link to="/games" className="mt-7 inline-flex rounded-full bg-ink px-6 py-3 font-black text-white shadow-xl shadow-ink/20">
        Back to games
      </Link>
    </section>
  );
}
