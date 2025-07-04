# Merge Instructions

This document provides instructions for merging changes from a feature branch back to the main branch using both GitHub Pull Request (PR) and GitHub CLI methods.

## Prerequisites

- You have completed your work on a feature branch
- Your code changes have been committed and pushed to the remote repository
- You have appropriate permissions to merge code into the main branch

## Method 1: Merging via GitHub Pull Request (Web Interface)

1. **Navigate to the repository** on GitHub.com

2. **Create a new Pull Request**:
   - Click on the "Pull requests" tab
   - Click the green "New pull request" button
   - In the "compare" dropdown, select your feature branch
   - In the "base" dropdown, ensure "main" is selected
   - Click "Create pull request"

3. **Fill in PR details**:
   - Add a descriptive title for your PR
   - In the description, explain the changes you've made and why
   - Reference any related issues by using keywords like "Closes #123" or "Fixes #456"
   - Add any relevant labels, reviewers, assignees, or projects

4. **Review the changes**:
   - Scroll down to see all file changes
   - Ensure all changes look correct
   - Review any automated checks or CI/CD results

5. **Merge the PR**:
   - Once all checks pass and reviews are complete, click the green "Merge pull request" button
   - Choose the appropriate merge method (merge commit, squash and merge, or rebase and merge)
   - Click "Confirm merge"
   - Optionally, delete the feature branch if it's no longer needed

## Method 2: Merging via GitHub CLI

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh
   
   # Windows
   winget install --id GitHub.cli
   
   # Linux
   sudo apt install gh  # For Debian/Ubuntu
   ```

2. **Authenticate with GitHub CLI**:
   ```bash
   gh auth login
   ```

3. **Create a Pull Request**:
   ```bash
   # Ensure you're on your feature branch
   git checkout your-feature-branch
   
   # Create the PR
   gh pr create --base main --title "Your PR title here" --body "Description of your changes"
   ```

4. **Review the Pull Request**:
   ```bash
   # List all open PRs
   gh pr list
   
   # View details of your PR
   gh pr view
   
   # Check the status of CI checks
   gh pr checks
   ```

5. **Merge the Pull Request**:
   ```bash
   # Merge your PR
   gh pr merge
   ```
   You'll be prompted to choose a merge method (merge commit, squash, or rebase).

6. **Clean up** (optional):
   ```bash
   # Delete the feature branch locally
   git checkout main
   git pull
   git branch -d your-feature-branch
   
   # Delete the feature branch remotely
   git push origin --delete your-feature-branch
   ```

## Alternative: Direct Command Line Merge (Without GitHub CLI)

1. **Switch to the main branch and update it**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge your feature branch**:
   ```bash
   git merge your-feature-branch
   ```

3. **Resolve any merge conflicts** if they occur

4. **Push the changes to remote**:
   ```bash
   git push origin main
   ```

5. **Clean up** (optional):
   ```bash
   # Delete the feature branch locally
   git branch -d your-feature-branch
   
   # Delete the feature branch remotely
   git push origin --delete your-feature-branch
   ```

## Best Practices

- Always pull the latest changes from main before creating a PR
- Write clear, concise commit messages and PR descriptions
- Reference related issues in your PR description
- Request code reviews from team members when appropriate
- Run tests locally before submitting your PR
- Address all review comments and ensure CI checks pass before merging
