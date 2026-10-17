"""The Claude Code plugin files mirror what install.py sets up: manifest, MCP server and hooks."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import install  # noqa: E402

PLUGIN_TOOLS = "mcp__plugin_master-jev-hook_master-jev-hook__.*"


def load_claude_jev(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "claude_jev.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PluginTests(unittest.TestCase):
    def test_manifest_points_at_existing_components_with_the_gateway_version(self):
        manifest = json.loads((ROOT / ".claude-plugin/plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["name"], install.NAME)
        self.assertEqual(manifest["version"], json.loads((ROOT / "gateway/package.json").read_text(encoding="utf-8"))["version"])
        self.assertEqual(manifest["license"], "Apache-2.0")  # The LICENSE file at the root.
        for path in (*manifest["skills"], manifest["mcpServers"], manifest["hooks"]):
            self.assertTrue(path.startswith("./"), path)
            self.assertTrue((ROOT / path).exists(), path)
        self.assertTrue((ROOT / "skills/master-jev-hook/SKILL.md").is_file())

    def test_mcp_server_runs_the_bundled_adapter(self):
        servers = json.loads((ROOT / ".mcp.json").read_text(encoding="utf-8"))["mcpServers"]
        server = servers[install.NAME]
        self.assertEqual(server["command"], "node")
        self.assertEqual(server["args"], ["${CLAUDE_PLUGIN_ROOT}/gateway/bin/master-jev-mcp.mjs"])
        self.assertTrue((ROOT / "gateway/bin/master-jev-mcp.mjs").is_file())
        self.assertIn("MASTER_JEV_GATEWAY_URL", server["env"])

    def test_hooks_mirror_the_installer(self):
        hooks = json.loads((ROOT / "hooks/hooks.json").read_text(encoding="utf-8"))["hooks"]
        flat = [(event, group.get("matcher"), hook) for event, groups in hooks.items() for group in groups for hook in group["hooks"]]
        self.assertEqual(len(flat), len(install.HOOKS))
        by_command = {hook["command"]: (event, matcher, hook) for event, matcher, hook in flat}
        for event, matcher, mode, status, timeout in install.HOOKS:
            p_event, p_matcher, hook = by_command[f'python3 "${{CLAUDE_PLUGIN_ROOT}}/claude_jev.py" {mode}']
            self.assertEqual((event, PLUGIN_TOOLS if matcher == install.JEV_TOOLS else matcher), (p_event, p_matcher), mode)
            self.assertEqual(hook["timeout"], timeout, mode)
            self.assertEqual(hook.get("statusMessage"), status, mode)

    def test_hook_script_uses_the_plugin_tool_prefix_and_data_folder(self):
        with tempfile.TemporaryDirectory(prefix="jev-plugin-") as data:
            os.environ["CLAUDE_PLUGIN_ROOT"], os.environ["CLAUDE_PLUGIN_DATA"] = str(ROOT), data
            try:
                plugin = load_claude_jev("claude_jev_plugin")
                path = plugin.state_file("s1", "turn")
            finally:
                del os.environ["CLAUDE_PLUGIN_ROOT"], os.environ["CLAUDE_PLUGIN_DATA"]
            self.assertEqual(plugin.MCP_PREFIX + ".*", PLUGIN_TOOLS)
            self.assertEqual(path.parent, Path(data) / "state")
            self.assertEqual(path.parent.stat().st_mode & 0o777, 0o700)
        plain = load_claude_jev("claude_jev_plain")
        self.assertEqual(plain.MCP_PREFIX, "mcp__master-jev-hook__")
        self.assertEqual(plain.state_file("s1", "turn").parent, ROOT / "state")


if __name__ == "__main__":
    unittest.main()
