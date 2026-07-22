Feature: JWT decoder
  Cookie values containing JWTs are flagged and decoded inline —
  perfect for debugging auth0 sessions.

  Scenario: JWT badge and decoded claims for a token cookie
    Given the browser has a JWT cookie "token" for "example.com" expiring in one hour
    When I open the manager page
    Then the cookie row "token" shows a "JWT" badge
    When I expand the cookie row "token"
    Then the decoded panel shows an unexpired token
    And the decoded panel shows claim value "auth0|user-1"
