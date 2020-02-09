const { main, run } = require('./main');
const { test } = require('tap');
const td = require('testdouble');

const fakeCore = (input = {}, setFailed = td.func('setFailed'), output = {}) => ({
    getInput: key => input[key],
    output,
    setOutput: (key, value) => (output[key] = value),
    setFailed,
});

const fakePR = (...labels) => ({
    number: 12345,
    body: 'PR_BODY',
    title: 'PR_TITLE',
    labels: labels.map(l => ({ name: l })),
});

const fakeGitHub = (context = {}) => {
    const GitHub = td.constructor(['repos']);
    GitHub.prototype.repos.listPullRequestsAssociatedWithCommit = td.func('listPulls');
    return {
        GitHub,
        context: {
            payload: {},
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'SHA',
            ...context,
        },
    };
};

test('should resolve PR without labels from context', async t => {
    const core = fakeCore();
    const pull_request = fakePR();

    await run(fakeGitHub({ payload: { pull_request } }), core);

    t.hasStrict(core.output, {
        number: pull_request.number,
        title: pull_request.title,
        body: pull_request.body,
    });
});

test('should resolve PR with labels from context', async t => {
    const core = fakeCore();
    const pull_request = fakePR('autox', 'LABEL');

    await run(fakeGitHub({ payload: { pull_request } }), core);

    t.hasStrict(core.output, {
        label_autox: true,
        label_LABEL: true,
    });
});

test('should exit early when running on default branch', async t => {
    const log = td.func('console.log');

    await run(
        fakeGitHub({
            payload: {
                repository: {
                    default_branch: 'master',
                },
                ref: 'refs/heads/master',
            },
        }),
        fakeCore(),
        log
    );

    td.verify(log(td.matchers.contains('default branch')));
});

test('should resolve PR for status events', async t => {
    const core = fakeCore();
    const { GitHub, context } = fakeGitHub({
        payload: {
            sha: 'BRANCH_SHA'
        },
        eventName: 'status',
        sha: 'MASTER_SHA'
    });
    td.when(
        GitHub.prototype.repos.listPullRequestsAssociatedWithCommit({
            ...context.repo,
            commit_sha: 'BRANCH_SHA'
        })
    ).thenResolve({
        status: 200,
        url: 'https://api.github.com/repos/owner/repo/commits/BRANCH_SHA/pulls',
        data: [{ state: 'open', ...fakePR('autoX') }],
    });

    await run({ GitHub, context }, core);

    t.hasStrict(core.output, {label_autoX: true});
});

test('run should call core.setFailed when pr can not be resolved but is required', async t => {
    const core = fakeCore({ required: true });
    const { GitHub, context } = fakeGitHub();
    td.when(
        GitHub.prototype.repos.listPullRequestsAssociatedWithCommit(td.matchers.anything())
    ).thenResolve({
        status: 200,
        url: 'https://api.github.com/repos/owner/repo/commits/SHA/pulls',
        data: [],
    });

    await run({ GitHub, context }, core);

    td.verify(core.setFailed('PR could not be resolved.'));
});

test('run should correctly resolve PR from API call', async t => {
    const core = fakeCore({ required: true });
    const { GitHub, context } = fakeGitHub();
    td.when(
        GitHub.prototype.repos.listPullRequestsAssociatedWithCommit(td.matchers.anything())
    ).thenResolve({
        status: 200,
        url: 'https://api.github.com/repos/owner/repo/commits/SHA/pulls',
        data: [{ state: 'open', ...fakePR('Foo') }],
    });

    await run({ GitHub, context }, core);

    t.hasStrict(core.output, {label_Foo: true});
});

test('main should call core.setFailed when GitHub rejects', async t => {
    const core = fakeCore();
    const { GitHub, context } = fakeGitHub();
    td.when(
        GitHub.prototype.repos.listPullRequestsAssociatedWithCommit(td.matchers.anything())
    ).thenReject(new Error('from test'));

    await main({ GitHub, context }, core);

    td.verify(core.setFailed('from test'));
});
