import { callFqlxQuery } from '../../../client';
import { NETWORK_ERROR } from '../../../error';
import { ZustandState } from '../../../zustand/interface';
import zustandStore from '../../../zustand/store';

export default function firstWhere<T>(collectionName: string, query: string) {
  const store = zustandStore.getStore();

  const executor = (): T => {
    //     // Checking, query is already executed
    if (store.getState().activeQuery[query]) {
      // Return data from state
      return store.getState().activeQuery[query] as T;
    }

    // Calling Fqlx API
    const req = callFqlxQuery(query);

    // Updating fetchingPromise in state
    store.setState({
      fetchingPromise: { current: req },
    } as ZustandState);

    const runQuery = () => {
      let error = null;

      req
        .then(res => {
          console.log({ fqlxRes: res });
          // Storing API res in local state
          store.setState({
            [collectionName]: {
              data: res ? [res] : [],
              after: null,
              before: null,
            },
            fetchingPromise: {},
            activeQuery: {
              ...store.getState().activeQuery,
              [query]: res || {},
            },
          } as ZustandState);

          return (store.getState()[collectionName]?.data[0] || {}) as T;
        })
        .catch(err => {
          throw new Error(err);
          console.log({ err });
          error = err;
          if (!err?.message?.includes(NETWORK_ERROR)) {
            // Reset fetchingPromise in state
            store.setState(({
              [collectionName]: {
                data: [],
                after: null,
                before: null,
              },
              activeQuery: {
                ...store.getState().activeQuery,
                [query]: false,
              },
            } as unknown) as ZustandState);
          }

          store.setState(({
            fetchingPromise: {},
          } as unknown) as ZustandState);
        }) as T;
      console.log('========error========', error);

      if (error) {
        throw new Error(error);
      }

      return (store.getState()[collectionName]?.data[0] || {}) as T;
    };

    return runQuery();
  };

  return {
    exec: executor,
  };
}
