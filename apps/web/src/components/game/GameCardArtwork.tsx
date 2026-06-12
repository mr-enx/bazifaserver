type GameCardArtworkProps = {
  middleImage: string;
  backImage: string;
  frontImage: string;
  alt?: string;
};

export function GameCardArtwork({
  middleImage,
  backImage,
  frontImage,
  alt = 'game artwork'
}: GameCardArtworkProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl">
      <img
        src={backImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <img
        src={middleImage}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />

      <img
        src={frontImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
