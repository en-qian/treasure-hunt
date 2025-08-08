import { BaseApi } from '@utils/controllers';

export interface Initialize extends BaseApi {
  Method: 'POST';
  Route: '/api/auth/initialize';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {};
  ResBody: {
    userId: string;
    email: string;
  };
}

export interface Register extends BaseApi {
  Method: 'POST';
  Route: '/api/auth/register-new-player';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  };
  ResBody: { userId: string };
}

export interface Login extends BaseApi {
  Method: 'POST';
  Route: '/api/auth/login';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {
    email: string;
    password: string;
  };
  ResBody: { sessionToken: string };
}

export interface GetProfile extends BaseApi {
  Method: 'GET';
  Route: '/api/auth/profile';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {};
  ResBody: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UpdateProfile extends BaseApi {
  Method: 'PUT';
  Route: '/api/auth/profile';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: { firstName: string; lastName: string };
  ResBody: undefined;
}

export interface Logout extends BaseApi {
  Method: 'PUT';
  Route: '/api/auth/logout';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {};
  ResBody: undefined;
}
