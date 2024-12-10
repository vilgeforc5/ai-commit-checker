declare global {
	declare const brand: unique symbol;

	type Branded<T, U> = T & {[brand]: U};
}

export {};
