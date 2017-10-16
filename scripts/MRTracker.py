#!/usr/bin/env python

import requests
import json
from datetime import datetime
import numpy as np

# go to https://git.terrain.int/profile/account to find your private token
GITLAB_PRIVATE_TOKEN='PUT-YOUR-TOKEN-HERE'

# the project id for terrain/Search is 2; get all merged MRs from gitlab...
def getMRbyPage(page):
    r = requests.get('https://git.terrain.int/api/v4/projects/2/merge_requests', verify=False, params={'state': 'merged', 'scope': 'all', 'page': str(page), 'per_page': '100'}, headers={'PRIVATE-TOKEN': GITLAB_PRIVATE_TOKEN})
    return r.json()

def toHMS(sec):
    m, s = divmod(sec, 60)
    h, m = divmod(m, 60)
    return '%d:%02d:%02d' % (h, m, s)

page = 1
resp = getMRbyPage(page)
MRs = resp
while len(resp) != 0 and page < 20:
    page = page + 1
    resp = getMRbyPage(page)
    MRs.extend(resp)

times = np.zeros(len(MRs))
for i in range(len(MRs)):
    d1 = datetime.strptime(MRs[i]['created_at'], '%Y-%m-%dT%H:%M:%S.%fZ')
    d2 = datetime.strptime(MRs[i]['updated_at'], '%Y-%m-%dT%H:%M:%S.%fZ')
    times[i] = (d2 - d1).total_seconds()

print 'MR statistics (units in H:M:S)'
print 'count \t\t=', len(MRs)
print 'min \t\t=', toHMS(np.amin(times))
print 'max \t\t=', toHMS(np.amax(times))
print 'median \t\t=', toHMS(np.median(times))
print 'avg \t\t=', toHMS(np.average(times))
print 'stddev \t\t=', toHMS(np.std(times))
print 'variance \t=', toHMS(np.var(times))
print '75 percentile \t=', toHMS(np.percentile(times, 75))
print '90 percentile \t=', toHMS(np.percentile(times, 90))
print '95 percentile \t=', toHMS(np.percentile(times, 95))
