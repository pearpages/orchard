import type { Profile } from '../../core/types'
import './ProfileTabs.scss'

interface ProfileTabsProps {
  profiles: Profile[]
  selectedId: string | null
  onSelect: (profileId: string) => void
  onAdd: () => void
}

export function ProfileTabs({ profiles, selectedId, onSelect, onAdd }: ProfileTabsProps) {
  return (
    <nav className="profile-tabs">
      {profiles.map((profile) => {
        const classes = [
          'profile-tabs__tab',
          profile.id === selectedId ? 'profile-tabs__tab--selected' : '',
          profile.enabled ? '' : 'profile-tabs__tab--disabled',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={profile.id}
            className={classes}
            type="button"
            onClick={() => onSelect(profile.id)}
          >
            {profile.enabled && (
              <span className="profile-tabs__dot" aria-hidden="true" title="Profile is active" />
            )}
            {profile.title || 'Untitled'}
          </button>
        )
      })}
      <button className="profile-tabs__add-btn" type="button" onClick={onAdd} aria-label="Add profile">
        +
      </button>
    </nav>
  )
}
