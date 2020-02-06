const { run } = require('./main');
const { test } = require('tap');
const td = require('testdouble');

const fakeCore = (output = {}, input = {}, setFailed = td.func('setFailed')) => ({
    getInput: key => input[key],
    setOutput: (key, value) => (output[key] = value),
    setFailed,
});

const fakePR = (...labels) => ({
    number: 12345,
    body: 'PR_BODY',
    title: 'PR_TITLE',
    labels: labels.map(l => ({ name: l })),
});

test('should resolve PR without labels from context', async t => {
    const out = {};
    const pull_request = fakePR();

    await run({ GitHub: td.constructor, context: { payload: { pull_request } } }, fakeCore(out));

    t.hasStrict(out, {
        number: pull_request.number,
        title: pull_request.title,
        body: pull_request.body,
    });
});

test('should resolve PR with labels from context', async t => {
    const out = {};
    const pull_request = fakePR('autox', 'LABEL');

    await run({ GitHub: td.constructor, context: { payload: { pull_request } } }, fakeCore(out));

    t.hasStrict(out, {
        label_autox: true,
        label_LABEL: true,
    });
});

test('should exit early when running on default branch', async t => {
    const log = td.func('console.log');

    await run(
        {
            GitHub: td.constructor,
            context: {
                payload: {
                    repository: {
                        default_branch: 'master',
                    },
                    ref: 'refs/heads/master',
                },
            },
        },
        fakeCore(),
        log
    );

    td.verify(log(td.matchers.contains('default branch')));
});
