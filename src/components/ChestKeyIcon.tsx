import './ChestKeyIcon.css';

export function ChestKeyIcon({size=20}:{size?:number}) {
  return (
    <span className="chest-key-icon" style={{width:size,height:size}} aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}assets/ui/tanuki-crystal.png`} alt="Tanuki phàm tinh thể" />
    </span>
  );
}

export const TanukiCelestialIcon = ChestKeyIcon;
