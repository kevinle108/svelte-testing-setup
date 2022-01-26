import SignUpPage from '$lib/components/SignUpPage.svelte';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import 'whatwg-fetch';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

describe('Sign Up Page', () => {
  describe('Layout', () => {
    it('has Sign Up header', () => {
      render(SignUpPage);
      const header = screen.getByRole('heading', { name: 'Sign Up' });
      expect(header).toBeInTheDocument();
    });

    it('has username input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('Username');
      expect(input).toBeInTheDocument();
    });

    it('has email input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('E-mail');
      expect(input).toBeInTheDocument();
    });
    
    it('has password input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('Password');
      expect(input).toBeInTheDocument();
    });

    it('has password type for password input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('Password') as HTMLInputElement;
      expect(input.type).toBe('password')
    });
    
    it('has password repeat input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('Password Repeat');
      expect(input).toBeInTheDocument();
    });

    it('has password type for password repeat input', () => {
      render(SignUpPage);
      const input = screen.getByLabelText('Password Repeat') as HTMLInputElement;
      expect(input.type).toBe('password')
    });

    it('has a Sign Up button', () => {
      render(SignUpPage);
      const button = screen.getByRole('button', {name: 'Sign Up'});
      expect(button).toBeInTheDocument();
    });
    
    it('has a Sign Up button disabled', () => {
      render(SignUpPage);
      const button = screen.getByRole('button', {name: 'Sign Up'});
      expect(button).toBeDisabled();
    });

  });
  
  describe('Interactions', () => {
    let requestBody;
    let counter = 0;
    const server = setupServer(
      rest.post('/api/1.0/users', (req, res, ctx) => {
        requestBody = req.body;
        counter++;
        return res(ctx.status(200));
      })
    );

    beforeAll(() => {
      server.listen();
    });

    afterAll(() => {
      server.close();
    });

    beforeEach(() => {
      counter = 0;
      server.resetHandlers();
    });

    let button;
    const setup = async () => {
      render(SignUpPage);
      const username = screen.getByLabelText('Username') as HTMLElement;
      const email = screen.getByLabelText('E-mail') as HTMLElement;
      const pw1 = screen.getByLabelText('Password') as HTMLElement;
      const pw2 = screen.getByLabelText('Password Repeat') as HTMLElement;
      button = screen.getByRole('button', {name: 'Sign Up'});
      await userEvent.type(username, 'user1');
      await userEvent.type(email, 'user1@mail.com');
      await userEvent.type(pw1, 'P4ssword');
      await userEvent.type(pw2, 'P4ssword');      
    }

    

    it('enables button once both password inputs match', async () => {
      await setup();      
      expect(button).toBeEnabled();
    });

    it('sends username, email, and password to backend after clicking the button', async () => {
      await setup();
      await userEvent.click(button);

      await screen.findByText('Please check your e-mail to activate your account');

      expect(requestBody).toEqual({
        username: "user1",
        email: "user1@mail.com",
        password: "P4ssword"
      });
    });

    it('disables the button when there is an ongoing api call', async () => {
      await setup();
      await userEvent.click(button);
      await userEvent.click(button);

      await screen.findByText('Please check your e-mail to activate your account');

      expect(counter).toBe(1);
     
    });

    it('displays spinner while the api request in progress', async () => {
      await setup();
      await userEvent.click(button);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('does not display spinner when there is no api request', async () => {
      await setup();
      const spinner = screen.queryByRole('status');
      expect(spinner).not.toBeInTheDocument();
    });

    it('displays account activation information after successful sign up request', async () => {
      await setup();
      await userEvent.click(button);

      const text = await screen.findByText('Please check your e-mail to activate your account');
      expect(text).toBeInTheDocument();
    });

    it('does not display account activation message before sign up request', async () => {
      await setup();
      const text = screen.queryByText('Please check your e-mail to activate your account');
      expect(text).not.toBeInTheDocument();
    });

    it('does not display account activation message after failed sign up request', async () => {
      server.use(
        rest.post('/api/1.0/users', (req, res, ctx) => {
          return res(ctx.status(400));
        })
      );
      
      await setup();
      await userEvent.click(button);

      const text = screen.queryByText('Please check your e-mail to activate your account');
      expect(text).not.toBeInTheDocument();
    });
    
    it('hides sign up form after successful sign up request', async () => {
      await setup();
      await userEvent.click(button);

      const form = screen.getByTestId('sign-up-form');
      await waitFor(() => {
        expect(form).not.toBeInTheDocument();
      });
    });
    
    it('displays validation message for username', async () => {
      server.use(
        rest.post('/api/1.0/users', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            validationErrors: {
              username: 'Username cannot be null'
            }
          }));
        })
      );
      
      await setup();
      await userEvent.click(button);

      const usernameValidationError = await screen.findByText('Username cannot be null');
      expect(usernameValidationError).toBeInTheDocument();     
    });
    
    it('does not display validation message initially', async () => {
      await setup();

      const validationAlert = screen.queryByRole('alert');
      expect(validationAlert).not.toBeInTheDocument();     
    });

    it('hides spinner after response received', async () => {
      server.use(
        rest.post('/api/1.0/users', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            validationErrors: {
              username: 'Username cannot be null'
            }
          }));
        })
      );
      await setup();
      await userEvent.click(button);
      await screen.findByText('Username cannot be null');
      const spinner = screen.queryByRole('status');
      expect(spinner).not.toBeInTheDocument();
    });
    
    it('enables the button after response received', async () => {
      server.use(
        rest.post('/api/1.0/users', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            validationErrors: {
              username: 'Username cannot be null'
            }
          }));
        })
      );
      await setup();
      await userEvent.click(button);
      await screen.findByText('Username cannot be null');
      expect(button).toBeEnabled();
    });
        
  });
});

