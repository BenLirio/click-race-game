# Quick Deployment Guide

## Option 1: GitHub Actions (Recommended)

This is the easiest way to deploy. The included GitHub Actions workflow will automatically deploy the game when you push to the main branch.

### Setup:

1. Go to your GitHub repository: https://github.com/BenLirio/click-race-game
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID` - Your AWS access key
   - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

4. The deployment will run automatically! Check the **Actions** tab to see the deployment progress.

5. Once complete, the game URL will be shown in the workflow output.

---

## Option 2: Local Deployment

If you prefer to deploy from your local machine:

### Prerequisites:
- AWS CLI installed and configured with credentials
- AWS SAM CLI installed
- Node.js 18+ installed

### Steps:

1. **Configure AWS credentials:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

2. **Install SAM CLI** (if not already installed):
   ```bash
   # On macOS with Homebrew
   brew tap aws/tap
   brew install aws-sam-cli
   
   # On Linux
   wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
   unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
   sudo ./sam-installation/install
   ```

3. **Deploy the application:**
   ```bash
   # Build the SAM application
   sam build
   
   # Deploy (first time will be interactive)
   sam deploy --guided
   
   # Or for subsequent deployments
   sam deploy
   ```

4. **Get the deployment outputs:**
   ```bash
   # Get WebSocket endpoint
   aws cloudformation describe-stacks \
     --stack-name click-race-game \
     --query 'Stacks[0].Outputs[?OutputKey==`WebSocketEndpoint`].OutputValue' \
     --output text
   
   # Get Frontend bucket
   aws cloudformation describe-stacks \
     --stack-name click-race-game \
     --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
     --output text
   ```

5. **Update frontend with WebSocket endpoint:**
   Edit `frontend/app.js` and replace:
   ```javascript
   const WS_ENDPOINT = 'wss://YOUR_API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com/prod';
   ```
   With the actual WebSocket endpoint from step 4.

6. **Upload frontend to S3:**
   ```bash
   aws s3 sync frontend/ s3://YOUR_FRONTEND_BUCKET --delete
   ```

7. **Access your game:**
   The game URL will be displayed in the CloudFormation outputs or in the S3 bucket properties.

---

## Troubleshooting

### WebSocket Connection Issues
- Make sure the WebSocket endpoint in `frontend/app.js` matches the deployed endpoint
- Check that the API Gateway stage is deployed
- Verify Lambda functions have the correct permissions

### CORS Issues
- The frontend is served from S3, not API Gateway, so CORS shouldn't be an issue
- If testing locally, you may need to disable CORS in your browser for development

### Game Not Updating
- Check the browser console for WebSocket connection errors
- Verify the WebSocket connection is established (look for "Connected" in the bottom right)
- Try refreshing the page and rejoining the room

---

## Cleanup

To remove all AWS resources created by this deployment:

```bash
sam delete --stack-name click-race-game

# Also delete the S3 bucket manually from the AWS Console
# (buckets must be empty before deletion)
```
