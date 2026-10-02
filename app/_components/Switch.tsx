// On/off switch for portal settings
export default function Switch({ on, onClick, disabled, labelledBy }: { on: boolean; onClick: () => void; disabled?: boolean; labelledBy: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} onClick={onClick} disabled={disabled}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'bg-green-400' : 'bg-rule-3'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
