Contributing
------------

You’ve decided to contribute? Awesome! Here are some things you should know.

- The `master` branch hosts the latest stable version.
- The development version is in the `integration` branch.

#### The lifecycle of a great contribution

1. Fork the repo.

2. Create a new branch off of `integration` with a descriptive name like
   `feature/add-more-emoji`.

3. Make [atomic commits][atomic], i.e. commits that only modify a single aspect
   of the project. This makes it easier to review, apply and roll back changes.

4. [Write good commit messages.][messages] Here’s an example, adapted from Tim
   Pope’s example and [git-scm.com][git-scm]:

   ```
   The first line should fit in 50 characters.

   More detailed explanatory text, if necessary. Wrap it to about 72
   characters or so.

   It’s a good idea to use the imperative present tense when writing the
   first line. In other words, use commands. Instead of "I added tests for"
   or "Adding tests for," use "Add tests for."

   - Bullet points are okay, too.

   - Typically a hyphen or asterisk is used for the bullet, preceded by a
     single space, with blank lines in between, but conventions vary here.

   ```

5. If you need to clean up your commit history before submitting a pull request,
   use [interactive rebase][rebase]: `git rebase -i integration`. This is good
   for combining commits that fix mistakes in previous ones.

6. When done, open a pull request from your feature branch to the `integration`
   branch. Be sure to select `integration` instead of `master`.

[atomic]:   https://en.wikipedia.org/wiki/Atomic_commit#Atomic_Commit_Convention
[messages]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
[git-scm]:  http://git-scm.com/book/ch5-2.html
[rebase]:   https://help.github.com/articles/about-git-rebase/
