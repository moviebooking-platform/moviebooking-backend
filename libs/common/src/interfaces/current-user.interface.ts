export interface ICurrentUser {
  id: number;
  email: string;
  name: string;
  role: {
    id: number;
    code: string;
    name: string;
  };
  theatreId?: number;
}
