import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import type { GameType } from '@game-platform/shared';
import { fetchGames } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

import ticTacToeMiddleImage from '../assets/image-Tic Tac Toe.png';
import imageGuessMiddleImage from '../assets/image-Image Guess.png';
import chessMiddleImage from '../assets/image-chess.png';

import gameCardBackImage from '../assets/game-card-back.png';
import gameCardFrontImage from '../assets/game-card-front.png';

import playersBadge from '../assets/players-badge.png';
import menuClickSound from '../assets/sounds/menu_click_06.ogg';
import { GameCardArtwork } from '../components/game/GameCardArtwork';

export function GamesPage() {
  const token = useAuthStore((state) => state.token);
  const { soundVolume } = useSettingsStore();
  const [searchParams] = useSearchParams();
  const requestedGameType = searchParams.get('type');
  const gameType: GameType = requestedGameType === 'offline' ? 'offline' : 'online';

  const playClickSound = () => {
    const audio = new Audio(menuClickSound);
    audio.volume = soundVolume / 100;
    audio.play().catch(console.error);
  };

  const gamesQuery = useQuery({
    queryKey: ['games', gameType],
    queryFn: () => fetchGames(token!, gameType),
    enabled: Boolean(token)
  });

  const activeGames = gamesQuery.data?.filter((game) => game.isActive && game.gameType === gameType) ?? [];

  const getGameMiddleImage = (game: { name: string; id: string | number }) => {
    const gameName = game.name.toLowerCase();

    if (gameName.includes('tic tac toe') || gameName.includes('xo')) {
      return ticTacToeMiddleImage;
    }

    if (gameName.includes('image guess') || gameName.includes('guess')) {
      return imageGuessMiddleImage;
    }

    if (gameName.includes('chess') || gameName.includes('شطرنج')) {
      return chessMiddleImage;
    }

    return ticTacToeMiddleImage;
  };

  const getGameTitle = (game: { name: string; id: string | number }) => {
    const gameName = game.name.toLowerCase();

    if (gameName.includes('tic tac toe') || gameName.includes('xo')) {
      return 'بازی دوز';
    }

    if (gameName.includes('image guess') || gameName.includes('guess')) {
      return 'بازی حدس تصویر';
    }

    if (gameName.includes('chess') || gameName.includes('شطرنج')) {
      return 'بازی شطرنج';
    }

    return game.name;
  };

  return (
    <section className="mt-8 space-y-8">
      <h1 className="font-mikhak text-center text-3xl font-black tracking-tight text-white">
        {gameType === 'offline' ? 'لیست بازی های آفلاین' : 'لیست بازی های آنلاین'}
      </h1>

      {gamesQuery.isLoading ? (
        <div className="font-mikhak p-6 text-center font-black">
          Loading games...
        </div>
      ) : null}

      {gamesQuery.isError ? (
        <div className="p-5 text-ember">
          <p className="font-mikhak font-black">Could not load games.</p>
          <p className="font-mikhak mt-2 font-bold">
            {gamesQuery.error instanceof Error
              ? gamesQuery.error.message
              : 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => void gamesQuery.refetch()}
            className="font-mikhak mt-4 bg-ember px-5 py-3 font-black text-white"
          >
            Retry
          </button>
        </div>
      ) : null}

      {gamesQuery.data ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-2 md:gap-x-4 md:gap-y-10">
{activeGames.map((game) => (
  <Link
    key={game.id}
    to={`/games/${game.id}/rooms`}
    onClick={playClickSound}
    className="group relative block aspect-square w-full overflow-visible"
  >
    <GameCardArtwork
      backImage={gameCardBackImage}
      middleImage={getGameMiddleImage(game)}
      frontImage={gameCardFrontImage}
      alt={getGameTitle(game)}
    />

    <div className="absolute top-0 right-0 z-20 -translate-x-1/4 -translate-y-1/2">
      <div className="relative flex items-center justify-center">
        <img
          src={playersBadge}
          alt="players badge"
          className="h-8 w-auto sm:h-10"
        />

        <span
          className="font-mikhak absolute text-[10px] font-black text-white sm:text-xs"
          style={{
            textShadow: '0 2px 0 #0000002c'
          }}
        >
          {game.minPlayers}-{game.maxPlayers}
        </span>
      </div>
    </div>

    <div className="relative z-10 flex h-full flex-col justify-between p-3 text-white sm:p-5">
      <div className="flex justify-start">
        <span className="font-mikhak px-2.5 py-1 text-xs font-black text-white sm:px-3 sm:text-sm">
          {game.roomsCount} روم
        </span>
      </div>

      <div className="flex items-end justify-center">
        <span
          className="font-mikhak inline-block text-lg font-black text-white sm:text-2xl"
          style={{
            textShadow: '0 3px 0 #00000065'
          }}
        >
          {getGameTitle(game)}
        </span>
      </div>
    </div>
  </Link>
))}


        </div>
      ) : null}

      {gamesQuery.data && activeGames.length === 0 ? (
        <div className="font-mikhak rounded-[1.5rem] bg-white/70 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
          {gameType === 'offline'
            ? 'فعلا بازی آفلاین فعالی وجود ندارد.'
            : 'فعلا بازی آنلاین فعالی وجود ندارد.'}
        </div>
      ) : null}
    </section>
  );
}
