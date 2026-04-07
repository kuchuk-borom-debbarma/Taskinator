import { startRestServer } from '../src/restful/index.ts';
import { db } from '../src/database/index.ts';
import { authService } from '../src/modules/auth/index.ts';
import { projectService } from '../src/modules/project/index.ts';

async function run() {
    await db.deleteFrom('project').execute();
    await db.deleteFrom('pending_users').execute();
    await db.deleteFrom('users').execute();

    const app = startRestServer(3002);
    await authService.init();
    await projectService.init();

    // Sign up
    await authService.startSignUp({ email: 'test@example.com', username: 'testuser', password_raw: 'password' });
    
    // We need to bypass the email token since it uses uuidv4 in DB, let's just query it
    const pendingUser = await db.selectFrom('pending_users').selectAll().executeTakeFirstOrThrow();
    
    // Finish sign up
    // Wait... finishSignUp requires a token. Let's see how AuthService does it:
    // It verifies a JWT! We need to make a token manually if the email flow is skipped,
    // OR we just sign in after creating the token? 
    // Wait, startSignUp doesn't email the token? 
    // Actually AuthService doesn't send the email directly in startSignUp.
}

run().catch(console.error);
