#!/usr/bin/env python3
"""Double-fork daemonizer for the Next.js dev server.

Starts `bun run dev` as a fully detached daemon (new session, no controlling
tty, reparented to init) so it survives the tool session that launched it.
Log: /home/z/my-project/dev.log  |  PID file: /home/z/my-project/dev.pid
"""
import os
import sys
import time

PROJECT = "/home/z/my-project"
LOG = os.path.join(PROJECT, "dev.log")
PIDFILE = os.path.join(PROJECT, "dev.pid")

# Already running? Check the PID file + process liveness.
try:
    old = int(open(PIDFILE).read().strip())
    os.kill(old, 0)
    print(f"dev server already running (pid {old})")
    sys.exit(0)
except Exception:
    pass

# ── fork #1 ──
pid = os.fork()
if pid > 0:
    # Parent waits briefly so the grandchild can write the PID file.
    for _ in range(80):
        try:
            newpid = int(open(PIDFILE).read().strip())
            os.kill(newpid, 0)
            print(f"dev server daemonized (pid {newpid})")
            break
        except Exception:
            time.sleep(0.1)
    sys.exit(0)

os.setsid()

# ── fork #2 — fully detached ──
pid = os.fork()
if pid > 0:
    os._exit(0)

os.umask(0o022)
os.chdir(PROJECT)

# Redirect stdio to the log file.
logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
os.dup2(logfd, 0)
os.dup2(logfd, 1)
os.dup2(logfd, 2)

with open(PIDFILE, "w") as f:
    f.write(str(os.getpid()))

os.execvp("bun", ["bun", "run", "dev"])
