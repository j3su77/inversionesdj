import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import qs from "query-string";


function useTabManager({ initialTab = 'validar' } = {}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
  
    const [activeTab, setActiveTab] = useState(initialTab);
  
    useEffect(() => {
      if (!searchParams.get('tab')) {
        handleTabChange(initialTab);
      }
    }, [searchParams.get('tab'), initialTab]);
  
    useEffect(() => {
      setActiveTab(searchParams.get('tab')!);
    }, [searchParams.get('tab')]);
  
    const handleTabChange = (value: string) => {
      setActiveTab(value);
      const url = qs.stringifyUrl({
        url: pathname,
        query: { tab: value },
      }, { skipNull: true, skipEmptyString: true });
      router.push(url);
    };
  
    return { activeTab, handleTabChange };
  }
  
  export default useTabManager;