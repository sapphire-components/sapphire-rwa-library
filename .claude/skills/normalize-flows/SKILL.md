---
name: normalize-flows
description: Normalize the Start position and vertical spacing of every screen and block handler in an OutSystems module through the sapphire-dev Service Studio MCP.
disable-model-invocation: true
argument-hint: <ModuleName>
---

# Normalize flows

Normalize the client action handlers in module `$ARGUMENTS`.

If no module name was given, ask for one and stop.

## Reference layout

The reference is the OnReady handler on screen Locale in module `RW_DesignSystem`.

| Setting | Value |
| --- | --- |
| Start X | 914 |
| Start Y | 686 |
| Vertical step between rows | 2057 |
| Row and column tolerance | 600 |

## Rules

- Start moves to X 914, Y 686.
- Single-column flow: every node is within 600 of Start horizontally. Every node snaps to X 914.
- Branching flow: the whole flow shifts horizontally with Start, so branches keep their layout.
- Rows: nodes whose Y values are within 600 of each other form one row. Rows are re-spaced at 2057, ordered as before, with the Start row at Y 686. Nodes that shared a row keep sharing it.

## Scope

- Include screen actions on every screen and block actions on every block in the module.
- Skip module-level client actions, such as BuildColors or BuildDocumentation.
- Never publish.

## Steps

1. Call `createSessionToken` once with clientName `Claude Code`, unless this session already holds a token. Pass the token to every other sapphire-dev call.
2. Call `listApps`. If `$ARGUMENTS` is missing or `isOpen` is false, tell the user to open it in Service Studio and stop.
3. Call `startOmlEditSession` on the module. If a session is already open, call `endOmlEditSession` first.
4. Call `applyModelApiCode` with the script below. Use these imports exactly:
   `["OutSystems.Model", "OutSystems.Model.Logic", "OutSystems.Model.UI.Mobile"]`
5. Report any validation messages, and say which ones were already in the module. Missing roles and unused elements are usually pre-existing.
6. Call `omlMerge` with the returned `mutatedOmlPath`.
   - If it returns `merged: false` because the merge was cancelled, report that and don't retry.
   - If it times out, the Compare and Merge window is probably waiting for the user. Read back a handler before deciding whether the merge landed.
7. Verify by reading two blocks or screens with `getSerializedObjectByNameAndType`. Pick ones with several handlers, and a branching flow if there is one.
   - Object types: `OutSystems.Model.UI.Mobile.IMobileScreen` or `OutSystems.Model.UI.Mobile.IMobileBlock`.
   - A large result gets saved to a file. Parse it with PowerShell, because Python isn't installed:

     ```powershell
     $t = Get-Content -Raw "<saved file>"; $s = ($t | ConvertFrom-Json).result; $s = $s.Substring($s.IndexOf('{'), $s.LastIndexOf('}') - $s.IndexOf('{') + 1); $d = $s | ConvertFrom-Json; foreach ($a in $d.ScreenActions) { "$($a.Name): " + (($a.Nodes | ForEach-Object { "$($_.Object)($($_.X),$($_.Y))" }) -join ' ') }
     ```

8. Call `endOmlEditSession`. It reports `discardedChanges: true`. That only drops the working copy, and merged changes stay in the module.
9. Tell the user what changed, what you verified, and that nothing was published.

## Script

```csharp
eSpace => {
  const int SX = 914; const int SY = 686; const int STEP = 2057; const int TOL = 600;
  foreach (var flow in eSpace.MobileFlows.ToList()) {
    var screenActions = flow.Nodes.OfType<IMobileScreen>().SelectMany(s => s.ScreenActions).ToList();
    var blockActions = flow.Nodes.OfType<IMobileBlock>().SelectMany(b => b.ScreenActions).ToList();
    foreach (var a in screenActions.Concat(blockActions)) {
      var nodes = a.Nodes.ToList();
      var st = nodes.OfType<OutSystems.Model.Logic.Nodes.IStartNode>().FirstOrDefault();
      if (st == null) continue;
      int sx = st.HorizontalPosition; int sy = st.VerticalPosition;
      bool single = nodes.All(n => (n.HorizontalPosition - sx) <= TOL && (sx - n.HorizontalPosition) <= TOL);
      var ys = nodes.Select(n => n.VerticalPosition).OrderBy(y => y).ToArray();
      var starts = ys.Where((y, i) => i == 0 || y - ys[i - 1] > TOL).ToArray();
      int sr = starts.Count(c => c <= sy) - 1;
      foreach (var n in nodes) {
        int r = starts.Count(c => c <= n.VerticalPosition) - 1;
        int nx = single ? SX : n.HorizontalPosition + (SX - sx);
        int ny = SY + (r - sr) * STEP;
        n.HorizontalPosition = nx;
        n.VerticalPosition = ny;
      }
    }
  }
}
```

## Sandbox gotchas

- Imports must be `OutSystems.Model` or one of its sub-namespaces. Importing `System` is rejected.
- The code must not contain `Console` or any `System.`-qualified name. To see values, end the lambda with `throw new Exception("PROBE:" + s);`, using the unqualified `Exception`. The text comes back in `exceptionMessage`, and nothing is saved.
- LINQ methods like `ToList`, `OfType` and `Select` work without an import.
- `IStartNode` must be fully qualified as `OutSystems.Model.Logic.Nodes.IStartNode`. The bare name clashes with the BusinessProcesses one.
- No eSpace.Save call is needed, because the host adds it.
- For the full Model API contract, see the servicestudio-mcp-oml skill.
