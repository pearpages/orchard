import type { Profile } from '../../core/types'
import { Toggle } from './Toggle'
import './ProfileToolbar.scss'

interface ProfileToolbarProps {
  profile: Profile
  canDelete: boolean
  onRename: (title: string) => void
  onToggle: (enabled: boolean) => void
  onDelete: () => void
}

export function ProfileToolbar({
  profile,
  canDelete,
  onRename,
  onToggle,
  onDelete,
}: ProfileToolbarProps) {
  return (
    <div className="profile-toolbar">
      <input
        className="profile-toolbar__title-input"
        type="text"
        value={profile.title}
        onChange={(event) => onRename(event.target.value)}
        aria-label="Profile name"
      />
      <div className="profile-toolbar__actions">
        <Toggle
          checked={profile.enabled}
          onChange={onToggle}
          label={`Enable profile ${profile.title}`}
        />
        <button
          className="profile-toolbar__delete-btn"
          type="button"
          disabled={!canDelete}
          title={canDelete ? 'Delete profile' : 'The last profile cannot be deleted'}
          onClick={() => {
            if (window.confirm(`Delete profile "${profile.title}"?`)) onDelete()
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
