Feature: Edit and create cookies
  The editor must handle the tricky cookie rules (SameSite=None, prefixes)
  and write real cookies back to the browser.

  Scenario: Create a Secure SameSite=None cookie
    When I open the manager page
    And I create a cookie:
      | name     | token           |
      | domain   | api.example.com |
      | value    | t1              |
      | sameSite | no_restriction  |
      | secure   | yes             |
    Then the browser has a cookie "token" on "api.example.com" with SameSite "no_restriction"

  Scenario: Edit a cookie's value
    Given the browser has cookies:
      | name | domain      | value |
      | sid  | example.com | old   |
    When I open the manager page
    And I edit the cookie "sid" changing its value to "new"
    Then the cookie "sid" on "example.com" has value "new"
