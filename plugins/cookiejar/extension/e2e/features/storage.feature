Feature: Storage inspector
  The manager shows localStorage and sessionStorage of every open tab,
  grouped by origin, and lets you edit and delete keys.

  Scenario: Storage of an open tab appears in the manager and can be edited
    Given a test page is open that sets localStorage "greeting" to "hello"
    When I open the manager "storage" view
    Then I see a storage group for the test origin with key "greeting"
    When I edit the storage key "greeting" to "howdy"
    Then the test page localStorage "greeting" is "howdy"

  Scenario: Deleting a storage key is undoable
    Given a test page is open that sets localStorage "greeting" to "hello"
    When I open the manager "storage" view
    And I delete the storage key "greeting"
    Then a toast says 'Deleted "greeting"'
    And the test page localStorage has 0 keys
