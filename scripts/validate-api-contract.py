"""Offline structural/schema/example checks for the proposed API, not live API tests.

Run: python scripts/validate-api-contract.py
Requires the Python jsonschema package. Does not contact providers or a database.
"""
import json
import re
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / 'docs/api/chitrabodh.openapi.json').read_text(encoding='utf-8'))
assert spec['openapi'] == '3.1.1'
base = 'urn:chitrabodh:openapi'
resource = Resource.from_contents(spec, default_specification=__import__('referencing.jsonschema', fromlist=['DRAFT202012']).DRAFT202012)
registry = Registry().with_resource(base, resource)
checks = 0

def resolve(value):
    if '$ref' not in value:
        return value
    pointer = value['$ref']
    assert pointer.startswith('#/'), f'Unexpected external reference: {pointer}'
    result = spec
    for key in pointer[2:].split('/'):
        result = result[key.replace('~1', '/').replace('~0', '~')]
    return result

def walk(node):
    if isinstance(node, dict):
        if '$ref' in node:
            resolve(node)
        for v in node.values():
            yield from walk(v)
        yield node
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)

def absolute_refs(schema):
    if isinstance(schema, dict):
        return {k: base+v if k=='$ref' and v.startswith('#/') else absolute_refs(v) for k,v in schema.items()}
    if isinstance(schema, list):
        return [absolute_refs(v) for v in schema]
    return schema

def validate(schema, value):
    Draft202012Validator(absolute_refs(schema), registry=registry, format_checker=FormatChecker()).validate(value)

for node in walk(spec):
    if 'schema' in node and isinstance(node['schema'], dict):
        for example in [node['example']] if 'example' in node else []:
            validate(node['schema'], example)
            checks += 1
        for example in node.get('examples', {}).values():
            validate(node['schema'], example['value'])
            checks += 1

for name, schema in spec['components']['schemas'].items():
    Draft202012Validator.check_schema(schema)
    for value in schema.get('examples', []):
        validate({'$ref':f'#/components/schemas/{name}'}, value)
        checks += 1

ids = set()
for path, methods in spec['paths'].items():
    for method, operation in methods.items():
        assert method in {'get','post','patch','delete','head'}
        assert operation['operationId'] not in ids
        ids.add(operation['operationId'])
        params = [resolve(p) for p in operation.get('parameters', [])]
        keys = [(p['in'],p['name']) for p in params]
        assert len(keys) == len(set(keys)), path
        assert set(re.findall(r'{([^}]+)}',path)) == {p['name'] for p in params if p['in']=='path'}
        assert all(p['required'] for p in params if p['in']=='path')
        assert any(code.startswith('2') or code == '303' for code in operation['responses'])
        if method in {'post','patch','delete'}:
            assert ('header','X-CSRF-Token') in keys, path
            assert ('header','Origin') in keys, path
        if method=='head':
            assert all('content' not in resolve(r) for r in operation['responses'].values()), path
        if '204' in operation['responses']:
            assert 'content' not in operation['responses']['204']

negative = [
    ('GenerationRequest', {}),
    ('GenerationRequest', {'topic':'Search','projectId':'10000000-0000-4000-8000-000000000001','expectedRevision':1}),
    ('GenerationRequest', {'projectId':'10000000-0000-4000-8000-000000000001'}),
    ('GenerationRequest', {'topic':'Search','ownerId':'injected'}),
    ('PreferenceUpdate', {'expectedRevision':1}),
    ('PublicationCreate', {'artifactId':'40000000-0000-4000-8000-000000000001','connectionId':'50000000-0000-4000-8000-000000000001','description':'','mode':'schedule'}),
    ('PublicationUpdate', {'expectedRevision':1,'dueAt':'2026-10-31T10:00:00Z'}),
    ('PageInfo', {'limit':51,'hasMore':False,'nextCursor':None}),
    ('PageInfo', {'limit':20,'hasMore':True,'nextCursor':None}),
    ('RevisionRequest', {'sourceVersionId':'20000000-0000-4000-8000-000000000001','expectedRevision':1,'instruction':'x'*1001}),
]
for name, value in negative:
    validator = Draft202012Validator({'$ref':f'{base}#/components/schemas/{name}'},registry=registry,format_checker=FormatChecker())
    assert not validator.is_valid(value), f'Unexpected valid negative example: {name}'

for filename in ['ChitraBodh-API-Design.md','ChitraBodh-Database-Design.md']:
    path = ROOT/'docs'/filename
    text = path.read_text(encoding='utf-8')
    assert text.count('```')%2 == 0, filename
    for link in re.findall(r'\]\(([^)]+)\)',text):
        if link.startswith(('https://','http://','#')):
            continue
        assert (path.parent/link.split('#')[0]).exists(), (filename,link)

print(f'PASS: {len(ids)} operations; {len(spec["components"]["schemas"])} schemas; {checks} example checks; {len(negative)} negative checks; references, parameters, CSRF and document links.')
print('These are offline contract checks, not a full OpenAPI metaschema validator or running-service/database tests.')
