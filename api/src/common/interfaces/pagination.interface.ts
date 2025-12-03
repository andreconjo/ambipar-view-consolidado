export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
}
