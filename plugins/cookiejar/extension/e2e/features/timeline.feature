Feature: Timeline and snapshot diff
  Every cookie change in the browser is recorded; snapshots let you
  diff the jar before and after a flow.

  Scenario: Timeline records a cookie set and remove
    When I open the manager "timeline" view
    And the browser sets cookie "session" for "example.com"
    Then the timeline shows a set event for "session"
    When the browser removes cookie "session" for "example.com"
    Then the timeline shows a removed event for "session"

  Scenario: Snapshot then diff shows an added cookie
    When I open the manager "timeline" view
    And I take a snapshot
    And the browser sets cookie "newcomer" for "example.com"
    And I diff against the snapshot
    Then the diff lists "newcomer" under "Added"
