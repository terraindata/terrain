#!/usr/bin/env python

import sys
import re
import subprocess
import json
import collections
from pprint import pprint

p = subprocess.Popen(['node', '../node_modules/.bin/tslint',
                      '-c', '../tslint.json', '--fix', '--type-check', '--project',  '../tsconfig.json',  '-t', 'json'],
                     stdout=subprocess.PIPE)
out, err = p.communicate()
if err:
  sys.exit(err);

lintErrors = collections.defaultdict(set)
lintOutput = json.loads(out)

for o in lintOutput:
  lintErrors[o['name']].add(o['ruleName'])

for file in lintErrors:
  with open(file, 'r+') as f:
    lines = f.readlines()
    insertAt = 0
    for i in range(len(lines)):
      # todo: skip over multi-line comments too
      if lines[i].startswith('// Copyright 2017 Terrain Data, Inc.'):
        continue
      insertAt = i
      break
    rules = ' '.join(lintErrors[file]) + '\n'
    disable = '// tslint:disable:' + rules
    if lines[insertAt+1].startswith('// tslint:disable:'):
      lines[insertAt+1] = lines[insertAt+1].rstrip() + ' ' + rules
    else:
      lines[insertAt:insertAt] = ['\n', disable]
    if lines[insertAt+2] != '\n':
      lines[insertAt+2:insertAt+2] = ['\n']
    f.seek(0)
    f.writelines(lines)
    f.truncate()
    print 'Fixed ' + file + ':' + str(insertAt) + ' by adding ' + disable

