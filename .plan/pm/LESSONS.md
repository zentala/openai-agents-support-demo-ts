# Delivery observations

- 2026-11-11: The standalone eval process did not inherit the service's key binding.
  The existing broker held the exact key reference; the operator-amended actual run
  used the existing with-key injector with a task-local broker-script binding.
  Model-name defaults alone had not established credential availability.

- 2026-11-11: On this run, non-login PowerShell avoids profile attempts to write
  global Git configuration. Preserve actual sandbox errors and use normal escalation.
- 2026-11-11: C2 review proposed unique IDs for hypothetical multiple mounts. Actual
  source showed one mount and no collision; DM rejected it as a current defect rather
  than making speculative reuse a delivery gate. This is a local observation.
