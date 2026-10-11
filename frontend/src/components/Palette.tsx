import { PALETTE } from "../constants";

interface PaletteProps {
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export default function Palette({ selected, onSelect, disabled }: PaletteProps) {
  return (
    <div className="palette" role="group" aria-label="Colour palette">
      {PALETTE.map((c) => (
        <button
          key={c.index}
          type="button"
          className={selected === c.index ? "swatch selected" : "swatch"}
          style={{ background: c.hex }}
          title={`${c.name} (#${c.index})`}
          aria-label={c.name}
          aria-pressed={selected === c.index}
          disabled={disabled}
          onClick={() => onSelect(c.index)}
        />
      ))}
    </div>
  );
}
