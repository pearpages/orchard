Feature: AI explain this cookie
  A developer can ask AI what a cookie is about. When no backend is
  configured, the panel guides them to set one up.

  Scenario: Explain offers setup when no AI backend is configured
    Given the browser has cookies:
      | name | domain      | value |
      | _ga  | example.com | GA1.1 |
    When I open the manager page
    And I expand the cookie row "_ga"
    And I ask the AI to explain the cookie
    Then the AI panel offers to set up AI
    When I open AI settings
    Then the AI settings show a Claude API key field
